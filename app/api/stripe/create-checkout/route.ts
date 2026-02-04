import { NextResponse } from "next/server";
import { createCheckoutAction } from "@/app/actions/subscriptions";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    console.log("💳 [API CREATE CHECKOUT] Recebendo requisição...");

    // Get authenticated user from Clerk
    const { userId } = await auth();

    if (!userId) {
      console.log("💳 [API CREATE CHECKOUT] ❌ Usuário não autenticado");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("💳 [API CREATE CHECKOUT] ✅ Usuário autenticado:", userId);

    // Parse request body
    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      console.log("💳 [API CREATE CHECKOUT] ❌ priceId não fornecido");
      return NextResponse.json(
        { error: "priceId is required" },
        { status: 400 },
      );
    }

    console.log("💳 [API CREATE CHECKOUT] priceId:", priceId);

    // Get user email from Clerk (for Stripe customer creation)
    // Note: In production, you might want to store this in your database
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    let userEmail: string | undefined;
    if (response.ok) {
      const userData = await response.json();
      userEmail = userData.email_addresses?.[0]?.email_address;
      console.log("💳 [API CREATE CHECKOUT] User email:", userEmail);
    }

    // Call the server action
    const result = await createCheckoutAction({
      priceId,
      userId,
      userEmail,
    });

    if (!result.success || !result.url) {
      console.log("💳 [API CREATE CHECKOUT] ❌ Falha ao criar checkout");
      return NextResponse.json(
        { error: result.error || "Failed to create checkout session" },
        { status: 500 },
      );
    }

    console.log("💳 [API CREATE CHECKOUT] ✅ Checkout criado com sucesso!");

    return NextResponse.json({
      success: true,
      url: result.url,
      sessionId: result.sessionId,
    });
  } catch (error) {
    console.error("💳 [API CREATE CHECKOUT] ❌ ERRO:", error);
    console.error(
      "💳 [API CREATE CHECKOUT] Erro detalhado:",
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
