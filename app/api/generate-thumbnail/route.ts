import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

/**
 * Generate a thumbnail from a video stored in R2
 * POST /api/generate-thumbnail
 * Body: { videoKey: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoKey } = body;

    if (!videoKey) {
      return NextResponse.json(
        { error: "videoKey is required" },
        { status: 400 }
      );
    }

    // Download video from R2
    console.log("🖼️ [THUMBNAIL] Baixando vídeo do R2:", videoKey);
    const getObjectCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: videoKey,
    });

    const videoObject = await r2Client.send(getObjectCommand);
    const videoBuffer = await streamToBuffer(videoObject.Body as any);
    console.log("🖼️ [THUMBNAIL] Vídeo baixado:", videoBuffer.length, "bytes");

    // Generate thumbnail using FFmpeg
    console.log("🖼️ [THUMBNAIL] Gerando thumbnail com FFmpeg...");
    const { spawn } = await import("child_process");

    // Create temp file paths
    const tempDir = "/tmp";
    const inputPath = `${tempDir}/input-${Date.now()}.mp4`;
    const outputPath = `${tempDir}/output-${Date.now()}.jpg`;

    // Write video buffer to temp file
    const { writeFile, unlink } = await import("fs/promises");
    await writeFile(inputPath, videoBuffer);

    // Run FFmpeg to generate thumbnail
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        inputPath,
        "-ss",
        "00:00:01", // Seek to 1 second
        "-vframes",
        "1",
        "-vf",
        "scale=320:-1", // Scale to width 320, maintain aspect ratio
        "-q:v",
        "2", // Quality
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data: Buffer) => {
        console.log("🖼️ [THUMBNAIL] FFmpeg:", data.toString());
      });

      ffmpeg.on("close", async (code) => {
        // Cleanup input file
        unlink(inputPath).catch(() => {});

        if (code !== 0) {
          console.error("🖼️ [THUMBNAIL] FFmpeg exited with code:", code);
          reject(new Error("Failed to generate thumbnail"));
          return;
        }

        // Read thumbnail file
        const { readFile } = await import("fs/promises");
        readFile(outputPath)
          .then((thumbnailBuffer) => {
            console.log("🖼️ [THUMBNAIL] Thumbnail gerada:", thumbnailBuffer.length, "bytes");

            // Generate thumbnail key
            const thumbnailKey = `thumbnails/${videoKey.split("/").pop()?.replace(".mp4", ".jpg")}`;

            // Upload thumbnail to R2
            const putObjectCommand = new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: thumbnailKey,
              Body: thumbnailBuffer,
              ContentType: "image/jpeg",
            });

            r2Client
              .send(putObjectCommand)
              .then(() => {
                // Cleanup output file
                unlink(outputPath).catch(() => {});

                // Generate thumbnail URL
                const thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailKey}`;

                console.log("🖼️ [THUMBNAIL] ✅ Thumbnail salva no R2:", thumbnailUrl);

                // Update database with thumbnail URL
                const dbUrl = process.env.DATABASE_URL;
                if (!dbUrl) throw new Error("DATABASE_URL not set");
                const sql = neon(dbUrl);

                sql`
                  UPDATE recordings
                  SET thumbnail_key = ${thumbnailKey}, thumbnail_url = ${thumbnailUrl}
                  WHERE video_key = ${videoKey}
                `.then(() => {
                  console.log("🖼️ [THUMBNAIL] ✅ Database atualizado");
                  resolve(
                    NextResponse.json({
                      success: true,
                      thumbnailUrl,
                      thumbnailKey,
                    })
                  );
                })
                .catch((error) => {
                  console.error("🖼️ [THUMBNAIL] ❌ Erro ao atualizar database:", error);
                  resolve(
                    NextResponse.json(
                      {
                        success: true,
                        thumbnailUrl,
                        thumbnailKey,
                        warning: "Failed to update database",
                      },
                      { status: 200 }
                    )
                  );
                });
              })
              .catch((error: unknown) => {
                console.error("🖼️ [THUMBNAIL] ❌ Erro ao fazer upload:", error);
                reject(error);
              });
          })
          .catch((error) => {
            console.error("🖼️ [THUMBNAIL] ❌ Erro ao fazer upload:", error);
            reject(error);
          });
      });

      ffmpeg.on("error", (error) => {
        // Cleanup temp files
        unlink(inputPath).catch(() => {});
        unlink(outputPath).catch(() => {});
        reject(error);
      });
    });
  } catch (error) {
    console.error("🖼️ [THUMBNAIL] ❌ ERRO:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    );
  }
}

/**
 * Convert a readable stream to a buffer
 */
function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
