import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

/**
 * Get transcoding status for a recording
 * GET /api/transcode/status/:recordingId
 * Response: { status, mp4Keys: { '720p', '1080p', '4k' } }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { recordingId } = await params;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const rows = await sql`
      SELECT transcode_status, transcode_error, mp4_key_720p, mp4_key_1080p, mp4_key_4k
      FROM recordings
      WHERE id = ${recordingId} AND user_id = ${clerkUserId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const rec = rows[0];

    return NextResponse.json({
      status: rec.transcode_status,
      error: rec.transcode_error,
      mp4Keys: {
        "720p": rec.mp4_key_720p,
        "1080p": rec.mp4_key_1080p,
        "4k": rec.mp4_key_4k,
      },
    });
  } catch (error) {
    console.error("[TRANSCODE STATUS] Error:", error);
    return NextResponse.json({ error: "Failed to get transcode status" }, { status: 500 });
  }
}
