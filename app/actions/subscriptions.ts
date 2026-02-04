"use server";

import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export interface CreateCheckoutInput {
  priceId: string;
  userId: string;
  userEmail?: string;
}

/**
 * Create or get Stripe customer for a user
 */
async function getOrCreateCustomer(userId: string, email?: string) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Check if user already has a stripe_customer_id stored
  // For now, we'll create a new customer each time or look up by email
  // In production, you'd store stripe_customer_id in the users table

  let customerId: string | null = null;

  // Try to find existing customer by email
  if (email) {
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
  }

  // Create new customer if not found
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        userId,
      },
    });
    customerId = customer.id;
  }

  return customerId;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutAction(input: CreateCheckoutInput) {
  console.log("💳 [CREATE CHECKOUT] Iniciando checkout...");
  console.log("💳 [CREATE CHECKOUT] Input:", {
    priceId: input.priceId,
    userId: input.userId,
    userEmail: input.userEmail,
  });

  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not set");
    }

    // Get or create Stripe customer
    console.log("💳 [CREATE CHECKOUT] Obtendo/criando customer...");
    const customerId = await getOrCreateCustomer(input.userId, input.userEmail);
    console.log("💳 [CREATE CHECKOUT] Customer ID:", customerId);

    // Determine success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/settings/subscription?canceled=true`;

    // Create checkout session
    console.log("💳 [CREATE CHECKOUT] Criando sessão de checkout...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: input.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: input.userId,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    });

    console.log("💳 [CREATE CHECKOUT] ✅ Sessão criada com sucesso!");
    console.log("💳 [CREATE CHECKOUT] Session ID:", session.id);
    console.log("💳 [CREATE CHECKOUT] Checkout URL:", session.url);

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("💳 [CREATE CHECKOUT] ❌ ERRO:", error);
    console.error(
      "💳 [CREATE CHECKOUT] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    };
  }
}

/**
 * Get user's current subscription
 */
export async function getSubscriptionAction(userId: string) {
  console.log("💳 [GET SUBSCRIPTION] Buscando assinatura do usuário:", userId);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const subscriptions = await sql`
      SELECT * FROM subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscriptions.length === 0) {
      return {
        success: true,
        subscription: null,
      };
    }

    const sub = subscriptions[0];

    return {
      success: true,
      subscription: {
        id: sub.id,
        userId: sub.user_id,
        stripeCustomerId: sub.stripe_customer_id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        stripePriceId: sub.stripe_price_id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      },
    };
  } catch (error) {
    console.error("💳 [GET SUBSCRIPTION] ❌ ERRO:", error);
    return {
      success: false,
      subscription: null,
      error: "Failed to fetch subscription",
    };
  }
}

/**
 * Cancel user's subscription at period end
 */
export async function cancelSubscriptionAction(subscriptionId: string) {
  console.log("💳 [CANCEL SUBSCRIPTION] Cancelando assinatura:", subscriptionId);

  try {
    // Cancel in Stripe
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log("💳 [CANCEL SUBSCRIPTION] ✅ Assinatura marcada para cancelamento");

    return {
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error("💳 [CANCEL SUBSCRIPTION] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to cancel subscription",
    };
  }
}
