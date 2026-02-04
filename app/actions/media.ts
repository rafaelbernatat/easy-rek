"use server";

import { neon } from "@neondatabase/serverless";
import {
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

// Temporary demo user ID - Replace with actual auth in production
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Generate a presigned URL for uploading to R2
 */
async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 3600, // 1 hour
  });

  return { uploadUrl, key };
}

/**
 * Get video duration from file
 * For now, we'll estimate based on file size (placeholder)
 * TODO: Implement actual duration extraction using ffmpeg or similar
 */
function estimateVideoDuration(fileSize: number): number {
  // Rough estimate: 1MB ≈ 6 seconds at 720p
  // This is a placeholder - should be replaced with actual extraction
  return Math.floor(fileSize / (1024 * 1024) * 6);
}

/**
 * Upload a video file to R2 and save metadata to database
 */
export async function uploadVideoAction({
  file,
  title,
}: {
  file: File;
  title: string;
}) {
  console.log("📤 [UPLOAD VIDEO] Iniciando upload...");
  console.log("📤 [UPLOAD VIDEO] Nome do arquivo:", file.name);
  console.log("📤 [UPLOAD VIDEO] Tamanho:", file.size, "bytes");
  console.log("📤 [UPLOAD VIDEO] Tipo:", file.type);
  console.log("📤 [UPLOAD VIDEO] File object type:", typeof file);
  console.log("📤 [UPLOAD VIDEO] File is File?", file instanceof File);

  try {
    // Validate file object
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file object provided");
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

    console.log("📤 [UPLOAD VIDEO] Gerando presigned URL...");
    const { uploadUrl, key } = await generatePresignedUploadUrl(
      videoKey,
      file.type,
    );
    console.log("📤 [UPLOAD VIDEO] Presigned URL gerada:", key);

    // Upload to R2 using the presigned URL
    console.log("📤 [UPLOAD VIDEO] Fazendo upload para R2...");
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

    console.log("📤 [UPLOAD VIDEO] ✅ Upload para R2 concluído!");

    // Generate thumbnail (placeholder - will be generated asynchronously)
    console.log("📤 [UPLOAD VIDEO] Gerando thumbnail...");
    const thumbnailKey = `thumbnails/${DEMO_USER_ID}/${timestamp}.jpg`;

    // Estimate video duration
    const duration = estimateVideoDuration(file.size);

    // Save metadata to database
    console.log("📤 [UPLOAD VIDEO] Salvando metadados no banco...");
    const thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailKey}`;

    // Trigger thumbnail generation asynchronously
    // This will be processed by the /api/generate-thumbnail endpoint
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-thumbnail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoKey: key }),
    }).catch((error) => {
      console.error("📤 [UPLOAD VIDEO] ⚠️ Erro ao gerar thumbnail:", error);
    });

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, thumbnail_key, thumbnail_url, duration, size)
      VALUES (${DEMO_USER_ID}, ${title}, ${key}, ${thumbnailKey}, ${thumbnailUrl}, ${duration}, ${file.size})
      RETURNING *
    `;

    const recording = newRecordings[0];
    console.log("📤 [UPLOAD VIDEO] ✅ Metadados salvos!");
    console.log("📤 [UPLOAD VIDEO] ID do registro:", recording.id);

    return {
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
    };
  } catch (error) {
    console.error("📤 [UPLOAD VIDEO] ❌ ERRO:", error);
    console.error(
      "📤 [UPLOAD VIDEO] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return {
      success: false,
      error: "Failed to upload video",
    };
  }
}

/**
 * Get a presigned URL for viewing/downloading a video from R2
 */
export async function getVideoUrlAction(videoKey: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: videoKey,
    });

    const url = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return {
      success: true,
      url,
    };
  } catch (error) {
    console.error("Error getting video URL:", error);
    return {
      success: false,
      error: "Failed to get video URL",
    };
  }
}
