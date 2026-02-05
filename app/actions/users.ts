"use server";

import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

/**
 * Get the current authenticated user from Clerk and sync with database
 * This ensures the user exists in our database with their Clerk data
 */
export async function getOrCreateUser(): Promise<string> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Check if user already exists in our database
  const existingUsers = await sql`
    SELECT * FROM users WHERE id = ${clerkUserId}
  `;

  if (existingUsers.length > 0) {
    // User exists, return their ID
    console.log("👤 [USER] Usuário encontrado:", clerkUserId);
    return clerkUserId;
  }

  // User doesn't exist, fetch from Clerk and create in database
  console.log("👤 [USER] Criando novo usuário:", clerkUserId);

  try {
    // Fetch user data from Clerk API
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkResponse.ok) {
      throw new Error(`Failed to fetch user from Clerk: ${clerkResponse.statusText}`);
    }

    const clerkUser = await clerkResponse.json();
    const email = clerkUser.email_addresses?.[0]?.email_address || null;
    const name = clerkUser.first_name
      ? `${clerkUser.first_name} ${clerkUser.last_name || ""}`.trim()
      : clerkUser.username || email?.split("@")[0] || "User";

    // Create user in database
    await sql`
      INSERT INTO users (id, email, name, plan_type)
      VALUES (${clerkUserId}, ${email}, ${name}, 'free')
    `;

    console.log("👤 [USER] ✅ Usuário criado com sucesso:", {
      id: clerkUserId,
      email,
      name,
    });

    return clerkUserId;
  } catch (error) {
    console.error("👤 [USER] ❌ Erro ao criar usuário:", error);

    // Fallback: Create user with minimal data if Clerk API fails
    await sql`
      INSERT INTO users (id, email, name, plan_type)
      VALUES (${clerkUserId}, ${clerkUserId}, 'User', 'free')
    `;

    console.log("👤 [USER] ✅ Usuário criado com dados mínimos:", clerkUserId);
    return clerkUserId;
  }
}

/**
 * Get user plan type
 */
export async function getUserPlanType(): Promise<"free" | "pro" | "enterprise"> {
  const userId = await getOrCreateUser();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  const users = await sql`
    SELECT plan_type FROM users WHERE id = ${userId}
  `;

  if (users.length === 0) {
    return "free";
  }

  return (users[0].plan_type as "free" | "pro" | "enterprise") || "free";
}
