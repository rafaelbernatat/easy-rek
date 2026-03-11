import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { createRecordingStubAction } from "@/app/actions/recordings";

/**
 * Initialize a multipart upload for streaming recording
 * POST /api/upload/multipart/init
 * Body: { fileName, contentType, fileType: 'video'|'camera'|'screen', recordingId? }
 * Response: { uploadId, key, recordingId }
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, contentType, fileType = "video", recordingId: existingRecordingId } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    let key: string;
    switch (fileType) {
      case "camera":
        key = `cameras/${clerkUserId}/${timestamp}-${sanitizedFileName}`;
        break;
      case "screen":
        key = `screens/${clerkUserId}/${timestamp}-${sanitizedFileName}`;
        break;
      case "video":
      default:
        key = `uploads/${clerkUserId}/${timestamp}-${sanitizedFileName}`;
        break;
    }

    // Create multipart upload in R2
    const command = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const response = await r2Client.send(command);
    const uploadId = response.UploadId!;

    // Create or reuse DB stub
    let recordingId = existingRecordingId;
    if (!recordingId) {
      const result = await createRecordingStubAction({
        title: sanitizedFileName,
        streamType: fileType,
        rawKey: key,
        uploadId,
      });

      if (!result.success) {
        return NextResponse.json({ error: "Failed to create recording stub" }, { status: 500 });
      }
      recordingId = result.recordingId;
    } else {
      // Update existing stub with new uploadId and rawKey
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const sql = neon(dbUrl);
        await sql`
          UPDATE recordings
          SET raw_key = ${key}, upload_id = ${uploadId}, upload_status = 'uploading'
          WHERE id = ${recordingId}
        `;
      }
    }

    return NextResponse.json({ uploadId, key, recordingId });
  } catch (error) {
    console.error("[MULTIPART INIT] Error:", error);
    return NextResponse.json({ error: "Failed to initialize multipart upload" }, { status: 500 });
  }
}
