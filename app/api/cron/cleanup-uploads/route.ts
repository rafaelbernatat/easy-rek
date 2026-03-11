import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

/**
 * Cron job to cleanup orphaned multipart uploads
 * Called by Vercel Cron at 4 AM daily
 * GET /api/cron/cleanup-uploads
 */
export async function GET(request: NextRequest) {
  console.log("🧹 [CLEANUP UPLOADS] Starting orphaned upload cleanup...");

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Find recordings stuck in 'uploading' state for more than 24h
    const orphaned = await sql`
      SELECT id, upload_id, raw_key
      FROM recordings
      WHERE upload_status = 'uploading'
        AND created_at < NOW() - INTERVAL '24 hours'
    `;

    console.log(`🧹 [CLEANUP UPLOADS] Found ${orphaned.length} orphaned uploads`);

    let aborted = 0;
    let failed = 0;

    for (const rec of orphaned) {
      if (rec.upload_id && rec.raw_key) {
        try {
          await r2Client.send(new AbortMultipartUploadCommand({
            Bucket: R2_BUCKET_NAME,
            Key: rec.raw_key,
            UploadId: rec.upload_id,
          }));
          aborted++;
        } catch (err) {
          // AbortMultipartUpload can fail if upload was already completed/aborted
          console.warn(`🧹 [CLEANUP UPLOADS] Abort failed for ${rec.id}:`, err);
          failed++;
        }
      }

      // Mark as aborted in DB regardless of R2 result
      await sql`
        UPDATE recordings
        SET upload_status = 'aborted', updated_at = NOW()
        WHERE id = ${rec.id}
      `;
    }

    console.log(`🧹 [CLEANUP UPLOADS] Done: ${aborted} aborted, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: orphaned.length,
      aborted,
      failed,
    });
  } catch (error) {
    console.error("🧹 [CLEANUP UPLOADS] Error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
