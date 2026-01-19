"use server";

import { neon } from "@neondatabase/serverless";

// Temporary demo user ID - Replace with actual auth in Phase 5
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Ensure demo user exists
 */
async function ensureDemoUser() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  const existingUsers = await sql`
    SELECT * FROM users WHERE id = ${DEMO_USER_ID}
  `;

  if (existingUsers.length === 0) {
    await sql`
      INSERT INTO users (id, email, name, plan_type)
      VALUES (${DEMO_USER_ID}, 'demo@easyrek.com', 'Demo User', 'free')
    `;
  }
}

export interface SaveRecordingInput {
  title: string;
  videoKey: string;
  cameraKey?: string; // Optional camera source key
  screenKey?: string; // Optional screen source key
  thumbnailKey?: string; // Optional thumbnail key
  duration: number; // in seconds
  size: number; // in bytes
}

/**
 * Save recording metadata to database
 */
export async function saveRecordingAction(input: SaveRecordingInput) {
  console.log("💾 [SAVE RECORDING] Iniciando salvamento...");
  console.log(
    "💾 [SAVE RECORDING] DATABASE_URL presente:",
    process.env.DATABASE_URL ? "✅ SIM" : "❌ NÃO",
  );
  console.log("💾 [SAVE RECORDING] Input recebido:", {
    title: input.title,
    videoKey: input.videoKey,
    cameraKey: input.cameraKey,
    screenKey: input.screenKey,
    thumbnailKey: input.thumbnailKey,
    duration: input.duration,
    size: input.size,
  });

  try {
    // Ensure demo user exists
    console.log("💾 [SAVE RECORDING] Garantindo usuário demo...");
    await ensureDemoUser();
    console.log("💾 [SAVE RECORDING] ✅ Usuário demo OK");

    // Create recording
    console.log("💾 [SAVE RECORDING] Criando registro no banco...");
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Build thumbnail URL if thumbnailKey is provided
    const thumbnailUrl = input.thumbnailKey
      ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${input.thumbnailKey}`
      : null;

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, camera_key, screen_key, thumbnail_key, thumbnail_url, duration, size)
      VALUES (${DEMO_USER_ID}, ${input.title}, ${input.videoKey}, ${input.cameraKey || null}, ${input.screenKey || null}, ${input.thumbnailKey}, ${thumbnailUrl}, ${input.duration}, ${input.size})
      RETURNING *
    `;

    const recording = newRecordings[0];
    console.log("💾 [SAVE RECORDING] ✅ Registro criado com sucesso!");
    console.log("💾 [SAVE RECORDING] ID do registro:", recording.id);

    return {
      success: true,
      recording: {
        id: recording.id,
        userId: recording.user_id,
        title: recording.title,
        videoKey: recording.video_key,
        cameraKey: recording.camera_key,
        screenKey: recording.screen_key,
        thumbnailUrl: recording.thumbnail_url,
        duration: recording.duration,
        size: Number(recording.size),
        createdAt: new Date(recording.created_at).toISOString(),
      },
    };
  } catch (error) {
    console.error("💾 [SAVE RECORDING] ❌ ERRO:", error);
    console.error(
      "💾 [SAVE RECORDING] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return {
      success: false,
      error: "Failed to save recording",
    };
  }
}

/**
 * Get all recordings for demo user
 */
export async function getRecordingsAction() {
  try {
    await ensureDemoUser();

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const recordings = await sql`
      SELECT * FROM recordings 
      WHERE user_id = ${DEMO_USER_ID}
      ORDER BY created_at DESC
    `;

    console.log("📥 [GET RECORDINGS] Total encontrado:", recordings.length);
    if (recordings.length > 0) {
      console.log("📥 [GET RECORDINGS] Primeiro registro:", {
        id: recordings[0].id,
        title: recordings[0].title,
        duration: recordings[0].duration,
        videoKey: recordings[0].video_key,
      });
    }

    return {
      success: true,
      recordings: recordings.map((rec: any) => {
        const videoUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${rec.video_key}`;
        const cameraUrl = rec.camera_key
          ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${rec.camera_key}`
          : null;
        const screenUrl = rec.screen_key
          ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${rec.screen_key}`
          : null;

        return {
          id: rec.id,
          userId: rec.user_id,
          title: rec.title,
          videoKey: rec.video_key,
          cameraKey: rec.camera_key,
          screenKey: rec.screen_key,
          videoUrl,
          cameraUrl,
          screenUrl,
          thumbnailUrl: rec.thumbnail_url,
          duration: rec.duration,
          size: Number(rec.size),
          editConfig: rec.edit_config,
          createdAt: new Date(rec.created_at).toISOString(),
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return {
      success: false,
      recordings: [],
    };
  }
}

/**
 * Update edit configuration for a recording
 */
export async function updateEditConfigAction(
  recordingId: string,
  editConfig: string,
) {
  console.log("💾 [UPDATE EDIT CONFIG] Iniciando atualização...");
  console.log("💾 [UPDATE EDIT CONFIG] RecordingId:", recordingId);
  console.log(
    "💾 [UPDATE EDIT CONFIG] EditConfig (primeiros 200 chars):",
    editConfig.substring(0, 200),
  );

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      UPDATE recordings 
      SET edit_config = ${editConfig}
      WHERE id = ${recordingId}
      RETURNING id, edit_config
    `;

    console.log("💾 [UPDATE EDIT CONFIG] ✅ Atualização concluída!");
    console.log("💾 [UPDATE EDIT CONFIG] Linhas afetadas:", result.length);

    return { success: true };
  } catch (error) {
    console.error("💾 [UPDATE EDIT CONFIG] ❌ Erro:", error);
    return {
      success: false,
      error: "Failed to save changes",
    };
  }
}

/**
 * Delete recording from database and R2
 */
export async function deleteRecordingAction(id: string) {
  console.log("🗑️ [DELETE RECORDING] Iniciando exclusão:", id);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Get recording to retrieve video key for R2 deletion
    const recordings = await sql`
      SELECT * FROM recordings WHERE id = ${id} AND user_id = ${DEMO_USER_ID}
    `;

    if (recordings.length === 0) {
      return {
        success: false,
        error: "Recording not found",
      };
    }

    const videoKey = recordings[0].video_key;
    const thumbnailKey = recordings[0].thumbnail_key;

    console.log("🗑️ [DELETE RECORDING] Dados do registro:", {
      videoKey,
      thumbnailKey,
    });

    // Delete from R2
    console.log("🗑️ [DELETE RECORDING] Deletando do R2:", videoKey);
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const { r2Client, R2_BUCKET_NAME } = await import("@/lib/r2");

      // Delete video
      const deleteVideoCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: videoKey,
      });

      await r2Client.send(deleteVideoCommand);
      console.log("🗑️ [DELETE RECORDING] ✅ Vídeo deletado do R2");

      // Delete thumbnail if exists
      if (thumbnailKey) {
        console.log(
          "🗑️ [DELETE RECORDING] Deletando thumbnail do R2:",
          thumbnailKey,
        );
        const deleteThumbnailCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbnailKey,
        });

        await r2Client.send(deleteThumbnailCommand);
        console.log("🗑️ [DELETE RECORDING] ✅ Thumbnail deletada do R2");
      } else {
        console.log("🗑️ [DELETE RECORDING] ⚠️ Nenhuma thumbnail para deletar");
      }
    } catch (r2Error) {
      console.error("🗑️ [DELETE RECORDING] ⚠️ Erro ao deletar do R2:", r2Error);
      // Continue even if R2 deletion fails
    }

    // Delete from database
    await sql`
      DELETE FROM recordings WHERE id = ${id} AND user_id = ${DEMO_USER_ID}
    `;

    console.log("🗑️ [DELETE RECORDING] ✅ Deletado do banco");

    return {
      success: true,
    };
  } catch (error) {
    console.error("🗑️ [DELETE RECORDING] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to delete recording",
    };
  }
}
