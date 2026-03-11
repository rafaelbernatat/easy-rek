import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Readable } from "stream";

// Vercel Background Function — max 300s execution time
export const maxDuration = 300;

const RESOLUTION_SETTINGS: Record<string, {
  scale: string;
  preset: string;
  crf: number;
  audioBitrate: string;
}> = {
  "720p":  { scale: "1280:720",   preset: "fast",   crf: 23, audioBitrate: "128k" },
  "1080p": { scale: "1920:1080",  preset: "medium",  crf: 22, audioBitrate: "192k" },
  "4k":    { scale: "3840:2160",  preset: "slow",    crf: 20, audioBitrate: "256k" },
};

/**
 * Worker for server-side transcoding
 * POST /api/transcode/worker
 * Protected by INTERNAL_API_SECRET header
 * Body: { recordingId, rawKey, targetResolutions, jobId }
 */
export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  let recordingId: string | undefined;

  try {
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    recordingId = body.recordingId;
    const { rawKey, targetResolutions = ["720p", "1080p"], jobId } = body;

    if (!recordingId || !rawKey) {
      return NextResponse.json({ error: "recordingId and rawKey are required" }, { status: 400 });
    }

    console.log(`[TRANSCODE WORKER] Starting job ${jobId} for recording ${recordingId}`);

    // Dynamically import to avoid bundling issues
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

    if (!dbUrl) throw new Error("DATABASE_URL not set");
    const sql = neon(dbUrl);

    // Download source WebM from R2
    const getCommand = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: rawKey });
    const sourceResponse = await r2Client.send(getCommand);

    if (!sourceResponse.Body) throw new Error("Empty source body from R2");

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${recordingId}-input.webm`);

    // Write source to temp file
    const chunks: Buffer[] = [];
    const readStream = sourceResponse.Body as Readable;
    for await (const chunk of readStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    fs.writeFileSync(inputPath, Buffer.concat(chunks));

    console.log(`[TRANSCODE WORKER] Source downloaded (${(fs.statSync(inputPath).size / 1024 / 1024).toFixed(1)}MB)`);

    const mp4Keys: Record<string, string> = {};

    for (const resolution of targetResolutions) {
      const settings = RESOLUTION_SETTINGS[resolution];
      if (!settings) {
        console.warn(`[TRANSCODE WORKER] Unknown resolution: ${resolution}, skipping`);
        continue;
      }

      const outputPath = path.join(tmpDir, `${recordingId}-${resolution}.mp4`);
      const outputKey = rawKey.replace(/\.webm$/, "").replace(/^uploads\//, `mp4/${resolution}/`) + `.mp4`;

      console.log(`[TRANSCODE WORKER] Transcoding ${resolution}...`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .addOptions([
            `-vf scale=${settings.scale}`,
            `-preset ${settings.preset}`,
            `-crf ${settings.crf}`,
            `-b:a ${settings.audioBitrate}`,
            "-movflags +faststart",
          ])
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err))
          .run();
      });

      console.log(`[TRANSCODE WORKER] ${resolution} transcoded, uploading to R2...`);

      // Upload MP4 to R2
      const mp4Buffer = fs.readFileSync(outputPath);
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: outputKey,
        Body: mp4Buffer,
        ContentType: "video/mp4",
      }));

      mp4Keys[resolution] = outputKey;

      // Cleanup temp output file
      fs.unlinkSync(outputPath);
      console.log(`[TRANSCODE WORKER] ${resolution} uploaded: ${outputKey}`);
    }

    // Cleanup input file
    fs.unlinkSync(inputPath);

    // Update DB with MP4 keys and done status
    await sql`
      UPDATE recordings
      SET
        transcode_status = 'done',
        mp4_key_720p  = COALESCE(${mp4Keys["720p"] ?? null}, mp4_key_720p),
        mp4_key_1080p = COALESCE(${mp4Keys["1080p"] ?? null}, mp4_key_1080p),
        mp4_key_4k    = COALESCE(${mp4Keys["4k"] ?? null}, mp4_key_4k),
        updated_at = NOW()
      WHERE id = ${recordingId}
    `;

    console.log(`[TRANSCODE WORKER] Job complete for ${recordingId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TRANSCODE WORKER] Error:", error);

    if (recordingId && dbUrl) {
      try {
        const sql = neon(dbUrl);
        const errMsg = error instanceof Error ? error.message : String(error);
        await sql`
          UPDATE recordings
          SET transcode_status = 'failed', transcode_error = ${errMsg}, updated_at = NOW()
          WHERE id = ${recordingId}
        `;
      } catch (dbErr) {
        console.error("[TRANSCODE WORKER] Failed to update error status:", dbErr);
      }
    }

    return NextResponse.json({ error: "Transcoding failed" }, { status: 500 });
  }
}
