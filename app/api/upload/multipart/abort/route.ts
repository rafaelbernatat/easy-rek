import { NextResponse } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

/**
 * Abort a multipart upload and clean up parts in R2
 * POST /api/upload/multipart/abort
 * Body: { uploadId, key, recordingId? }
 * Response: { success }
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, key, recordingId } = body;

    if (!uploadId || !key) {
      return NextResponse.json({ error: "uploadId and key are required" }, { status: 400 });
    }

    // Abort the multipart upload in R2
    const command = new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    await r2Client.send(command);

    // Update DB if recordingId provided
    if (recordingId) {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const sql = neon(dbUrl);
        await sql`
          UPDATE recordings
          SET upload_status = 'aborted', updated_at = NOW()
          WHERE id = ${recordingId}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MULTIPART ABORT] Error:", error);
    return NextResponse.json({ error: "Failed to abort multipart upload" }, { status: 500 });
  }
}
