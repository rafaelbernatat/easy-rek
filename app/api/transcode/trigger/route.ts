import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * Trigger server-side transcoding for a recording
 * POST /api/transcode/trigger
 * Protected by INTERNAL_API_SECRET header
 * Body: { recordingId, rawKey, targetResolutions: string[] }
 * Response: { success, jobId }
 */
export async function POST(request: Request) {
  try {
    // Verify internal secret
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recordingId, rawKey, targetResolutions = ["720p", "1080p"] } = body;

    if (!recordingId || !rawKey) {
      return NextResponse.json({ error: "recordingId and rawKey are required" }, { status: 400 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Update DB: mark as processing
    await sql`
      UPDATE recordings
      SET transcode_status = 'processing', updated_at = NOW()
      WHERE id = ${recordingId}
    `;

    const jobId = `${recordingId}-${Date.now()}`;

    // Fire-and-forget: dispatch worker (Background Function)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    fetch(`${baseUrl}/api/transcode/worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({ recordingId, rawKey, targetResolutions, jobId }),
    }).catch((err) => console.error("[TRANSCODE TRIGGER] Worker dispatch failed:", err));

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("[TRANSCODE TRIGGER] Error:", error);
    return NextResponse.json({ error: "Failed to trigger transcoding" }, { status: 500 });
  }
}
