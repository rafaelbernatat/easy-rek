import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

/**
 * Complete a multipart upload and trigger transcoding
 * POST /api/upload/multipart/complete
 * Body: { uploadId, key, recordingId, parts: [{PartNumber, ETag}], duration, totalSize, streamType }
 * Response: { success, location }
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, key, recordingId, parts, duration, totalSize, streamType } = body;

    if (!uploadId || !key || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: "uploadId, key, and parts are required" },
        { status: 400 }
      );
    }

    // Complete the multipart upload in R2
    const command = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p: { PartNumber: number; ETag: string }) => ({
          PartNumber: p.PartNumber,
          ETag: p.ETag,
        })),
      },
    });

    const response = await r2Client.send(command);
    const location = response.Location ?? key;

    // Update DB: mark upload complete, set video_key, trigger transcode
    if (recordingId) {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const sql = neon(dbUrl);
        await sql`
          UPDATE recordings
          SET
            video_key = ${key},
            raw_key = ${key},
            upload_status = 'complete',
            transcode_status = 'pending',
            duration = ${duration ?? 0},
            size = ${totalSize ?? 0},
            updated_at = NOW()
          WHERE id = ${recordingId}
        `;
      }

      // Fire-and-forget: trigger transcoding
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      fetch(`${baseUrl}/api/transcode/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: JSON.stringify({
          recordingId,
          rawKey: key,
          targetResolutions: ["720p", "1080p"],
        }),
      }).catch((err) => console.error("[MULTIPART COMPLETE] Transcode trigger failed:", err));
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error("[MULTIPART COMPLETE] Error:", error);
    return NextResponse.json({ error: "Failed to complete multipart upload" }, { status: 500 });
  }
}
