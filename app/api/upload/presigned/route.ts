import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

/**
 * Generate a presigned URL for uploading to R2
 * POST /api/upload/presigned
 * Content-Type: application/json
 * Body: { fileName, contentType, fileType? }
 */
export async function POST(request: Request) {
  console.log("🚀 [PRESIGNED URL API] Iniciando geração de presigned URL...");

  try {
    // Get authenticated user from Clerk
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("🚀 [PRESIGNED URL API] ❌ Usuário não autenticado");
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log("🚀 [PRESIGNED URL API] ✅ Usuário autenticado:", clerkUserId);

    // Ensure user exists in database
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const existingUsers = await sql`
      SELECT * FROM users WHERE id = ${clerkUserId}
    `;

    let userId = clerkUserId;
    if (existingUsers.length === 0) {
      // User doesn't exist, fetch from Clerk and create in database
      console.log("🚀 [PRESIGNED URL API] Criando novo usuário:", clerkUserId);

      try {
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

        await sql`
          INSERT INTO users (id, email, name, plan_type)
          VALUES (${clerkUserId}, ${email}, ${name}, 'free')
        `;

        console.log("🚀 [PRESIGNED URL API] ✅ Usuário criado com sucesso:", {
          id: clerkUserId,
          email,
          name,
        });
      } catch (error) {
        console.error("🚀 [PRESIGNED URL API] ❌ Erro ao criar usuário:", error);

        // Fallback: Create user with minimal data if Clerk API fails
        await sql`
          INSERT INTO users (id, email, name, plan_type)
          VALUES (${clerkUserId}, ${clerkUserId}, 'User', 'free')
        `;

        console.log("🚀 [PRESIGNED URL API] ✅ Usuário criado com dados mínimos:", clerkUserId);
      }
    }
    console.log("🚀 [PRESIGNED URL API] ✅ Usuário autenticado:", userId);

    // Parse request body
    const body = await request.json();
    const { fileName, contentType, fileType = "video" } = body;

    console.log("🚀 [PRESIGNED URL API] Parâmetros:", {
      fileName,
      contentType,
      fileType,
    });

    // Validate input
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    // Generate unique key for R2 with user ID
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    let key: string;
    switch (fileType) {
      case "thumbnail":
        key = `thumbnails/${userId}/${timestamp}-${sanitizedFileName}`;
        break;
      case "camera":
        key = `cameras/${userId}/${timestamp}-${sanitizedFileName}`;
        break;
      case "screen":
        key = `screens/${userId}/${timestamp}-${sanitizedFileName}`;
        break;
      case "video":
      default:
        key = `uploads/${userId}/${timestamp}-${sanitizedFileName}`;
        break;
    }

    console.log("🚀 [PRESIGNED URL API] Gerando presigned URL para key:", key);

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    console.log("🚀 [PRESIGNED URL API] ✅ Presigned URL gerada com sucesso");

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error("🚀 [PRESIGNED URL API] ❌ ERRO:", error);
    console.error(
      "🚀 [PRESIGNED URL API] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );

    // Return appropriate error status
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not authenticated")) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
