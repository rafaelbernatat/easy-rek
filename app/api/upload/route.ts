import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

// Temporary demo user ID - Replace with actual auth in production
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Upload a video file to R2 and save metadata to database
 * POST /api/upload
 * Content-Type: multipart/form-data
 */
export async function POST(request: NextRequest) {
  console.log("📤 [UPLOAD API] Iniciando upload...");

  try {
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;

    console.log("📤 [UPLOAD API] Nome do arquivo:", file?.name);
    console.log("📤 [UPLOAD API] Tamanho:", file?.size, "bytes");
    console.log("📤 [UPLOAD API] Tipo:", file?.type);
    console.log("📤 [UPLOAD API] Título:", title);

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided or invalid file" },
        { status: 400 }
      );
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");
    const sql = neon(dbUrl);

    // Ensure demo user exists
    const existingUsers = await sql`
      SELECT * FROM users WHERE id = ${DEMO_USER_ID}
    `;
    if (existingUsers.length === 0) {
      await sql`
        INSERT INTO users (id, email, name, plan_type)
        VALUES (${DEMO_USER_ID}, 'demo@easyrek.com', 'Demo User', 'free')
      `;
    }

    // Generate unique key for R2
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const videoKey = `uploads/${DEMO_USER_ID}/${timestamp}-${file.name}`;

    console.log("📤 [UPLOAD API] Gerando presigned URL...");
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: videoKey,
      ContentType: file.type,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });
    console.log("📤 [UPLOAD API] Presigned URL gerada:", videoKey);

    // Upload to R2 using the presigned URL
    console.log("📤 [UPLOAD API] Fazendo upload para R2...");
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
    }

    console.log("📤 [UPLOAD API] ✅ Upload para R2 concluído!");

    // Generate thumbnail (placeholder - will be generated asynchronously)
    console.log("📤 [UPLOAD API] Gerando thumbnail...");
    const thumbnailKey = `thumbnails/${DEMO_USER_ID}/${timestamp}.jpg`;

    // Estimate video duration
    const duration = Math.floor(file.size / (1024 * 1024) * 6);

    // Save metadata to database
    console.log("📤 [UPLOAD API] Salvando metadados no banco...");
    const thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailKey}`;

    // Trigger thumbnail generation asynchronously
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-thumbnail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoKey }),
    }).catch((error) => {
      console.error("📤 [UPLOAD API] ⚠️ Erro ao gerar thumbnail:", error);
    });

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, thumbnail_key, thumbnail_url, duration, size)
      VALUES (${DEMO_USER_ID}, ${title}, ${videoKey}, ${thumbnailKey}, ${thumbnailUrl}, ${duration}, ${file.size})
      RETURNING *
    `;

    const recording = newRecordings[0];
    console.log("📤 [UPLOAD API] ✅ Metadados salvos!");
    console.log("📤 [UPLOAD API] ID do registro:", recording.id);

    return NextResponse.json({
      success: true,
      recording: {
        id: recording.id,
        userId: recording.user_id,
        title: recording.title,
        videoKey: recording.video_key,
        thumbnailUrl: recording.thumbnail_url,
        duration: recording.duration,
        size: Number(recording.size),
        createdAt: new Date(recording.created_at).toISOString(),
      },
    });
  } catch (error) {
    console.error("📤 [UPLOAD API] ❌ ERRO:", error);
    console.error(
      "📤 [UPLOAD API] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
