import { NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";

/**
 * Generate a presigned URL for uploading a specific part
 * POST /api/upload/multipart/part
 * Body: { uploadId, key, partNumber }
 * Response: { presignedUrl }
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, key, partNumber } = body;

    if (!uploadId || !key || !partNumber) {
      return NextResponse.json(
        { error: "uploadId, key, and partNumber are required" },
        { status: 400 }
      );
    }

    const command = new UploadPartCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    return NextResponse.json({ presignedUrl });
  } catch (error) {
    console.error("[MULTIPART PART] Error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL for part" }, { status: 500 });
  }
}
