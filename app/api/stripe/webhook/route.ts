import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Determine plan type from Stripe price ID
 */
function getPlanTypeFromPriceId(priceId: string): string {
  // Map price IDs to plan types
  // These should match your Stripe Dashboard price IDs
  if (priceId.includes("pro")) {
    return "pro";
  } else if (priceId.includes("enterprise")) {
    return "enterprise";
  }
  return "free";
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("💳 [WEBHOOK] checkout.session.completed");

  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("💳 [WEBHOOK] Missing userId or subscriptionId");
    return;
  }

  console.log("💳 [WEBHOOK] userId:", userId);
  console.log("💳 [WEBHOOK] customerId:", customerId);
  console.log("💳 [WEBHOOK] subscriptionId:", subscriptionId);

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = subscription as any;
  const priceId = sub.items.data[0].price.id;
  const planType = getPlanTypeFromPriceId(priceId);

  console.log("💳 [WEBHOOK] priceId:", priceId);
  console.log("💳 [WEBHOOK] planType:", planType);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Update user's plan_type
  await sql`
    UPDATE users
    SET plan_type = ${planType}
    WHERE id = ${userId}
  `;
  console.log("💳 [WEBHOOK] ✅ User plan_type updated to:", planType);

  // Create subscription record
  await sql`
    INSERT INTO subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      canceled_at
    )
    VALUES (
      ${userId},
      ${customerId},
      ${subscriptionId},
      ${priceId},
      ${sub.status},
      ${new Date(sub.current_period_start * 1000).toISOString()},
      ${new Date(sub.current_period_end * 1000).toISOString()},
      ${sub.cancel_at_period_end},
      ${sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null}
    )
  `;
  console.log("💳 [WEBHOOK] ✅ Subscription record created");
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("💳 [WEBHOOK] customer.subscription.updated");

  const sub = subscription as any;
  const subscriptionId = sub.id;
  const priceId = sub.items.data[0].price.id;
  const planType = getPlanTypeFromPriceId(priceId);

  console.log("💳 [WEBHOOK] subscriptionId:", subscriptionId);
  console.log("💳 [WEBHOOK] priceId:", priceId);
  console.log("💳 [WEBHOOK] planType:", planType);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Get user_id from subscriptions table
  const subscriptions = await sql`
    SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscriptionId}
  `;

  if (subscriptions.length === 0) {
    console.error("💳 [WEBHOOK] Subscription not found in database");
    return;
  }

  const userId = subscriptions[0].user_id;

  // Update user's plan_type
  await sql`
    UPDATE users
    SET plan_type = ${planType}
    WHERE id = ${userId}
  `;
  console.log("💳 [WEBHOOK] ✅ User plan_type updated to:", planType);

  // Update subscription record
  await sql`
    UPDATE subscriptions
    SET
      stripe_price_id = ${priceId},
      status = ${sub.status},
      current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
      current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
      cancel_at_period_end = ${sub.cancel_at_period_end},
      canceled_at = ${sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null},
      updated_at = NOW()
    WHERE stripe_subscription_id = ${subscriptionId}
  `;
  console.log("💳 [WEBHOOK] ✅ Subscription record updated");
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("💳 [WEBHOOK] customer.subscription.deleted");

  const subscriptionId = subscription.id;

  console.log("💳 [WEBHOOK] subscriptionId:", subscriptionId);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Get user_id from subscriptions table
  const subscriptions = await sql`
    SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscriptionId}
  `;

  if (subscriptions.length === 0) {
    console.error("💳 [WEBHOOK] Subscription not found in database");
    return;
  }

  const userId = subscriptions[0].user_id;

  // Revert user to free plan
  await sql`
    UPDATE users
    SET plan_type = 'free'
    WHERE id = ${userId}
  `;
  console.log("💳 [WEBHOOK] ✅ User plan_type reverted to free");

  // Update subscription record
  await sql`
    UPDATE subscriptions
    SET
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE stripe_subscription_id = ${subscriptionId}
  `;
  console.log("💳 [WEBHOOK] ✅ Subscription record updated to canceled");
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("💳 [WEBHOOK] invoice.paid");

  const inv = invoice as any;
  const invoiceId = inv.id;
  const customerId = inv.customer as string;
  const subscriptionId = inv.subscription as string;
  const amount = inv.amount_paid;
  const currency = inv.currency;
  const hostedInvoiceUrl = inv.hosted_invoice_url;
  const invoicePdf = inv.invoice_pdf;
  const dueDate = inv.due_date;
  const paidAt = inv.status_transitions?.paid_at;

  console.log("💳 [WEBHOOK] invoiceId:", invoiceId);
  console.log("💳 [WEBHOOK] customerId:", customerId);
  console.log("💳 [WEBHOOK] subscriptionId:", subscriptionId);
  console.log("💳 [WEBHOOK] amount:", amount);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Get user_id and subscription_id from subscriptions table
  const subscriptions = await sql`
    SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = ${subscriptionId}
  `;

  if (subscriptions.length === 0) {
    console.error("💳 [WEBHOOK] Subscription not found in database");
    return;
  }

  const userId = subscriptions[0].user_id;
  const dbSubscriptionId = subscriptions[0].id;

  // Create invoice record
  await sql`
    INSERT INTO invoices (
      user_id,
      subscription_id,
      stripe_invoice_id,
      stripe_customer_id,
      amount,
      currency,
      status,
      hosted_invoice_url,
      invoice_pdf,
      due_date,
      paid_at
    )
    VALUES (
      ${userId},
      ${dbSubscriptionId},
      ${invoiceId},
      ${customerId},
      ${amount},
      ${currency},
      'paid',
      ${hostedInvoiceUrl || null},
      ${invoicePdf || null},
      ${dueDate ? new Date(dueDate * 1000).toISOString() : null},
      ${paidAt ? new Date(paidAt * 1000).toISOString() : null}
    )
  `;
  console.log("💳 [WEBHOOK] ✅ Invoice record created");
}

export async function POST(request: Request) {
  try {
    console.log("💳 [WEBHOOK] Recebendo webhook...");

    // Get raw body and signature
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("💳 [WEBHOOK] ❌ Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    if (!webhookSecret) {
      console.error("💳 [WEBHOOK] ❌ STRIPE_WEBHOOK_SECRET not set");
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET not configured" },
        { status: 500 },
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("💳 [WEBHOOK] ✅ Webhook signature verified");
      console.log("💳 [WEBHOOK] Event type:", event.type);
    } catch (err) {
      console.error("💳 [WEBHOOK] ❌ Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`💳 [WEBHOOK] Unhandled event type: ${event.type}`);
    }

    console.log("💳 [WEBHOOK] ✅ Webhook processed successfully");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("💳 [WEBHOOK] ❌ ERRO:", error);
    console.error(
      "💳 [WEBHOOK] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
