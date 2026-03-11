"use server";

import { neon } from "@neondatabase/serverless";
import { getOrCreateUser } from "./users";
import type { FilterState, SortType } from "@/types/video";

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
    // Get authenticated user
    console.log("💾 [SAVE RECORDING] Obtendo usuário autenticado...");
    const userId = await getOrCreateUser();
    console.log("💾 [SAVE RECORDING] ✅ Usuário autenticado:", userId);

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
      VALUES (${userId}, ${input.title}, ${input.videoKey}, ${input.cameraKey || null}, ${input.screenKey || null}, ${input.thumbnailKey}, ${thumbnailUrl}, ${input.duration}, ${input.size})
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
    const userId = await getOrCreateUser();
    console.log("📥 [GET RECORDINGS] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const recordings = await sql`
      SELECT * FROM recordings
      WHERE user_id = ${userId}
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
          sharing_enabled: rec.sharing_enabled,
          sharing_access: rec.sharing_access,
          sharing_password: rec.sharing_password,
          allow_download: rec.allow_download,
          sharing_slug: rec.sharing_slug,
          transcodeStatus: rec.transcode_status,
          transcodeError: rec.transcode_error,
          mp4Key720p: rec.mp4_key_720p,
          mp4Key1080p: rec.mp4_key_1080p,
          mp4Key4k: rec.mp4_key_4k,
          rawKey: rec.raw_key,
          uploadStatus: rec.upload_status,
          uploadId: rec.upload_id,
          createdAt: new Date(rec.created_at).toISOString(),
          updatedAt: rec.updated_at ? new Date(rec.updated_at).toISOString() : undefined,
          deletedAt: rec.deleted_at ? new Date(rec.deleted_at).toISOString() : null,
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
    const userId = await getOrCreateUser();
    console.log("🗑️ [DELETE RECORDING] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Get recording to retrieve video key for R2 deletion
    const recordings = await sql`
      SELECT * FROM recordings WHERE id = ${id} AND user_id = ${userId}
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
      DELETE FROM recordings WHERE id = ${id} AND user_id = ${userId}
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

/**
 * Update recording title
 */
export async function updateTitleAction(recordingId: string, title: string) {
  console.log("✏️ [UPDATE TITLE] Iniciando atualização...");
  console.log("✏️ [UPDATE TITLE] RecordingId:", recordingId);
  console.log("✏️ [UPDATE TITLE] Novo título:", title);

  try {
    const userId = await getOrCreateUser();
    console.log("✏️ [UPDATE TITLE] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      UPDATE recordings
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${recordingId} AND user_id = ${userId}
      RETURNING id, title, updated_at
    `;

    console.log("✏️ [UPDATE TITLE] ✅ Título atualizado com sucesso!");
    console.log("✏️ [UPDATE TITLE] Linhas afetadas:", result.length);

    if (result.length === 0) {
      console.error("✏️ [UPDATE TITLE] ❌ Nenhuma linha afetada - recording não encontrado ou não pertence ao usuário");
      return {
        success: false,
        error: "Recording not found or you don't have permission to edit it",
      };
    }

    return {
      success: true,
      recording: result[0],
    };
  } catch (error) {
    console.error("✏️ [UPDATE TITLE] ❌ ERRO:", error);
    console.error("✏️ [UPDATE TITLE] Erro detalhado:", error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update title",
    };
  }
}

/**
 * Soft delete a recording (move to trash)
 */
export async function softDeleteAction(recordingId: string) {
  console.log("🗑️ [SOFT DELETE] Iniciando soft delete:", recordingId);

  try {
    const userId = await getOrCreateUser();
    console.log("🗑️ [SOFT DELETE] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      UPDATE recordings
      SET deleted_at = NOW()
      WHERE id = ${recordingId} AND user_id = ${userId}
      RETURNING id, title
    `;

    console.log("🗑️ [SOFT DELETE] ✅ Soft delete concluído!");
    console.log("🗑️ [SOFT DELETE] Linhas afetadas:", result.length);

    return {
      success: true,
      recording: result[0],
    };
  } catch (error) {
    console.error("🗑️ [SOFT DELETE] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to move to trash",
    };
  }
}

/**
 * Get recording by ID
 */
export async function getRecordingByIdAction(recordingId: string) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const recordings = await sql`
      SELECT * FROM recordings WHERE id = ${recordingId}
    `;

    if (recordings.length === 0) {
      return {
        success: false,
        error: "Recording not found",
      };
    }

    const rec = recordings[0];

    return {
      success: true,
      recording: {
        id: rec.id,
        userId: rec.user_id,
        title: rec.title,
        videoKey: rec.video_key,
        cameraKey: rec.camera_key,
        screenKey: rec.screen_key,
        thumbnailUrl: rec.thumbnail_url,
        duration: rec.duration,
        size: Number(rec.size),
        editConfig: rec.edit_config,
        sharing_enabled: rec.sharing_enabled,
        sharing_access: rec.sharing_access,
        sharing_password: rec.sharing_password,
        allow_download: rec.allow_download,
        sharing_slug: rec.sharing_slug,
        createdAt: new Date(rec.created_at).toISOString(),
        updatedAt: rec.updated_at ? new Date(rec.updated_at).toISOString() : undefined,
      },
    };
  } catch (error) {
    console.error("Error fetching recording:", error);
    return {
      success: false,
      error: "Failed to fetch recording",
    };
  }
}

/**
 * Restore a recording from trash
 */
export async function restoreAction(recordingId: string) {
  console.log("♻️ [RESTORE] Iniciando restore:", recordingId);

  try {
    const userId = await getOrCreateUser();
    console.log("♻️ [RESTORE] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      UPDATE recordings
      SET deleted_at = NULL
      WHERE id = ${recordingId} AND user_id = ${userId}
      RETURNING id, title
    `;

    console.log("♻️ [RESTORE] ✅ Restore concluído!");
    console.log("♻️ [RESTORE] Linhas afetadas:", result.length);

    return {
      success: true,
      recording: result[0],
    };
  } catch (error) {
    console.error("♻️ [RESTORE] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to restore video",
    };
  }
}

/**
 * Permanently delete a recording from trash
 */
export async function permanentDeleteAction(recordingId: string) {
  console.log("🗑️ [PERMANENT DELETE] Iniciando exclusão permanente:", recordingId);

  try {
    const userId = await getOrCreateUser();
    console.log("🗑️ [PERMANENT DELETE] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Get recording to retrieve video keys for R2 deletion
    const recordings = await sql`
      SELECT * FROM recordings WHERE id = ${recordingId} AND user_id = ${userId}
    `;

    if (recordings.length === 0) {
      return {
        success: false,
        error: "Recording not found",
      };
    }

    const recording = recordings[0];
    const videoKey = recording.video_key;
    const thumbnailKey = recording.thumbnail_key;

    console.log("🗑️ [PERMANENT DELETE] Dados do registro:", {
      videoKey,
      thumbnailKey,
    });

    // Delete from R2
    console.log("🗑️ [PERMANENT DELETE] Deletando do R2:", videoKey);
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const { r2Client, R2_BUCKET_NAME } = await import("@/lib/r2");

      // Delete video
      const deleteVideoCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: videoKey,
      });

      await r2Client.send(deleteVideoCommand);
      console.log("🗑️ [PERMANENT DELETE] ✅ Vídeo deletado do R2");

      // Delete thumbnail if exists
      if (thumbnailKey) {
        console.log(
          "🗑️ [PERMANENT DELETE] Deletando thumbnail do R2:",
          thumbnailKey,
        );
        const deleteThumbnailCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbnailKey,
        });

        await r2Client.send(deleteThumbnailCommand);
        console.log("🗑️ [PERMANENT DELETE] ✅ Thumbnail deletada do R2");
      } else {
        console.log("🗑️ [PERMANENT DELETE] ⚠️ Nenhuma thumbnail para deletar");
      }
    } catch (r2Error) {
      console.error("🗑️ [PERMANENT DELETE] ⚠️ Erro ao deletar do R2:", r2Error);
      // Continue even if R2 deletion fails
    }

    // Delete from database
    await sql`
      DELETE FROM recordings WHERE id = ${recordingId} AND user_id = ${userId}
    `;

    console.log("🗑️ [PERMANENT DELETE] ✅ Deletado do banco");

    return {
      success: true,
    };
  } catch (error) {
    console.error("🗑️ [PERMANENT DELETE] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to permanently delete video",
    };
  }
}

/**
 * Get ORDER BY clause based on sort type
 */
function getOrderByClause(sortType?: SortType): string {
  switch (sortType) {
    case 'newest':
      return 'created_at DESC';
    case 'oldest':
      return 'created_at ASC';
    case 'title-asc':
      return 'title ASC';
    case 'title-desc':
      return 'title DESC';
    case 'duration-asc':
      return 'duration ASC';
    case 'duration-desc':
      return 'duration DESC';
    default:
      return 'created_at DESC';
  }
}

export async function getActiveVideosCountAction() {
  try {
    const userId = await getOrCreateUser();
    console.log("📥 [GET ACTIVE VIDEOS COUNT] Fetching active videos count");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      SELECT COUNT(*) as count FROM recordings
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
    `;

    const count = Number(result[0]?.count || 0);
    console.log("📥 [GET ACTIVE VIDEOS COUNT] Active videos count:", count);

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error("Error fetching active videos count:", error);
    return {
      success: false,
      count: 0,
    };
  }
}

export async function getTrashCountAction() {
  try {
    const userId = await getOrCreateUser();
    console.log("📥 [GET TRASH COUNT] Fetching trash count");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      SELECT COUNT(*) as count FROM recordings
      WHERE user_id = ${userId}
        AND deleted_at IS NOT NULL
    `;

    const count = Number(result[0]?.count || 0);
    console.log("📥 [GET TRASH COUNT] Trash count:", count);

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error("Error fetching trash count:", error);
    return {
      success: false,
      count: 0,
    };
  }
}

export async function getFilteredVideosAction(input: FilterState) {
  try {
    const userId = await getOrCreateUser();
    console.log("📥 [GET FILTERED VIDEOS] Fetching with filters:", input);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const orderBy = getOrderByClause(input.sortType);
    
    let recordings;
    
    if (input.viewMode === 'playlist' && input.playlistId) {
      // Playlist view with optional search
      if (input.searchQuery && input.searchQuery.trim()) {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NULL
            AND id IN (SELECT recording_id FROM playlist_items WHERE playlist_id = ${input.playlistId})
            AND title ILIKE ${'%' + input.searchQuery.trim() + '%'}
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      } else {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NULL
            AND id IN (SELECT recording_id FROM playlist_items WHERE playlist_id = ${input.playlistId})
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      }
    } else if (input.viewMode === 'trash') {
      // Trash view with optional search
      if (input.searchQuery && input.searchQuery.trim()) {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NOT NULL
            AND title ILIKE ${'%' + input.searchQuery.trim() + '%'}
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      } else {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NOT NULL
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      }
    } else {
      // All videos view with optional search
      if (input.searchQuery && input.searchQuery.trim()) {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NULL
            AND title ILIKE ${'%' + input.searchQuery.trim() + '%'}
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      } else {
        recordings = await sql`
          SELECT * FROM recordings
          WHERE user_id = ${userId}
            AND deleted_at IS NULL
          ORDER BY ${sql.unsafe(orderBy)}
        `;
      }
    }

    console.log("📥 [GET FILTERED VIDEOS] Total found:", recordings.length);

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
          sharing_enabled: rec.sharing_enabled,
          sharing_access: rec.sharing_access,
          sharing_password: rec.sharing_password,
          allow_download: rec.allow_download,
          sharing_slug: rec.sharing_slug,
          transcodeStatus: rec.transcode_status,
          transcodeError: rec.transcode_error,
          mp4Key720p: rec.mp4_key_720p,
          mp4Key1080p: rec.mp4_key_1080p,
          mp4Key4k: rec.mp4_key_4k,
          rawKey: rec.raw_key,
          uploadStatus: rec.upload_status,
          uploadId: rec.upload_id,
          createdAt: new Date(rec.created_at).toISOString(),
          updatedAt: rec.updated_at ? new Date(rec.updated_at).toISOString() : undefined,
          deletedAt: rec.deleted_at ? new Date(rec.deleted_at).toISOString() : null,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching filtered recordings:", error);
    return {
      success: false,
      recordings: [],
    };
  }
}

/**
 * Create a recording stub for streaming uploads
 * Called at the start of recording to get a recordingId before upload completes
 */
export async function createRecordingStubAction(params: {
  title: string;
  streamType: string;
  rawKey: string;
  uploadId: string;
  duration?: number;
  size?: number;
}) {
  try {
    const userId = await getOrCreateUser();
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      INSERT INTO recordings (
        user_id, title, video_key, duration, size,
        raw_key, upload_status, upload_id
      )
      VALUES (
        ${userId},
        ${params.title},
        ${params.rawKey},
        ${params.duration ?? 0},
        ${params.size ?? 0},
        ${params.rawKey},
        'uploading',
        ${params.uploadId}
      )
      RETURNING id
    `;

    return { success: true, recordingId: result[0].id as string };
  } catch (error) {
    console.error("Error creating recording stub:", error);
    return { success: false, error: "Failed to create recording stub" };
  }
}

/**
 * Update transcode status and optional MP4 keys after server-side transcoding
 */
export async function updateTranscodeStatusAction(
  recordingId: string,
  status: "pending" | "processing" | "done" | "failed",
  keys?: { mp4Key720p?: string; mp4Key1080p?: string; mp4Key4k?: string },
  error?: string,
) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    await sql`
      UPDATE recordings
      SET
        transcode_status = ${status},
        transcode_error = ${error ?? null},
        mp4_key_720p = COALESCE(${keys?.mp4Key720p ?? null}, mp4_key_720p),
        mp4_key_1080p = COALESCE(${keys?.mp4Key1080p ?? null}, mp4_key_1080p),
        mp4_key_4k = COALESCE(${keys?.mp4Key4k ?? null}, mp4_key_4k),
        updated_at = NOW()
      WHERE id = ${recordingId}
    `;

    return { success: true };
  } catch (error) {
    console.error("Error updating transcode status:", error);
    return { success: false, error: "Failed to update transcode status" };
  }
}
