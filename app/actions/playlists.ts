"use server";

import { neon } from "@neondatabase/serverless";
import { getOrCreateUser } from "./users";

export interface CreatePlaylistInput {
  name: string;
}

/**
 * Create a new playlist
 */
export async function createPlaylistAction(input: CreatePlaylistInput) {
  console.log("📋 [CREATE PLAYLIST] Iniciando criação...");
  console.log("📋 [CREATE PLAYLIST] Input recebido:", input);

  try {
    const userId = await getOrCreateUser();
    console.log("📋 [CREATE PLAYLIST] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const newPlaylists = await sql`
      INSERT INTO playlists (user_id, name)
      VALUES (${userId}, ${input.name})
      RETURNING *
    `;

    const playlist = newPlaylists[0];
    console.log("📋 [CREATE PLAYLIST] ✅ Playlist criada com sucesso!");
    console.log("📋 [CREATE PLAYLIST] ID da playlist:", playlist.id);

    return {
      success: true,
      playlist: {
        id: playlist.id,
        userId: playlist.user_id,
        name: playlist.name,
        createdAt: new Date(playlist.created_at).toISOString(),
        updatedAt: new Date(playlist.updated_at).toISOString(),
      },
    };
  } catch (error) {
    console.error("📋 [CREATE PLAYLIST] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to create playlist",
    };
  }
}

/**
 * Get all playlists for demo user
 */
export async function getPlaylistsAction() {
  try {
    const userId = await getOrCreateUser();
    console.log("📋 [GET PLAYLISTS] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const playlists = await sql`
      SELECT
        p.id,
        p.user_id,
        p.name,
        p.created_at,
        p.updated_at,
        COALESCE(COUNT(pi.id), 0) as video_count
      FROM playlists p
      LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
      WHERE p.user_id = ${userId}
      GROUP BY p.id, p.user_id, p.name, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    console.log("📥 [GET PLAYLISTS] Total encontrado:", playlists.length);

    return {
      success: true,
      playlists: playlists.map((pl: any) => ({
        id: pl.id,
        userId: pl.user_id,
        name: pl.name,
        videoCount: Number(pl.video_count),
        createdAt: new Date(pl.created_at).toISOString(),
        updatedAt: new Date(pl.updated_at).toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return {
      success: false,
      playlists: [],
    };
  }
}

/**
 * Delete a playlist
 */
export async function deletePlaylistAction(playlistId: string) {
  console.log("🗑️ [DELETE PLAYLIST] Iniciando exclusão:", playlistId);

  try {
    const userId = await getOrCreateUser();
    console.log("🗑️ [DELETE PLAYLIST] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Verify playlist belongs to user
    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${playlistId} AND user_id = ${userId}
    `;

    if (playlists.length === 0) {
      return {
        success: false,
        error: "Playlist not found",
      };
    }

    // Delete playlist (cascade will delete playlist_items)
    await sql`
      DELETE FROM playlists WHERE id = ${playlistId} AND user_id = ${userId}
    `;

    console.log("🗑️ [DELETE PLAYLIST] ✅ Playlist deletada");

    return {
      success: true,
    };
  } catch (error) {
    console.error("🗑️ [DELETE PLAYLIST] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to delete playlist",
    };
  }
}

/**
 * Add a recording to a playlist
 */
export async function addRecordingToPlaylistAction(
  playlistId: string,
  recordingId: string,
) {
  console.log("➕ [ADD TO PLAYLIST] Iniciando...");
  console.log("➕ [ADD TO PLAYLIST] PlaylistId:", playlistId);
  console.log("➕ [ADD TO PLAYLIST] RecordingId:", recordingId);
  console.log("➕ [ADD TO PLAYLIST] RecordingId type:", typeof recordingId);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Verify playlist belongs to user
    console.log("➕ [ADD TO PLAYLIST] Verificando playlist...");
    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${playlistId} AND user_id = ${DEMO_USER_ID}
    `;
    console.log("➕ [ADD TO PLAYLIST] Playlists encontradas:", playlists.length);

    if (playlists.length === 0) {
      return {
        success: false,
        error: "Playlist not found",
      };
    }

    // Check if recording already exists in playlist
    console.log("➕ [ADD TO PLAYLIST] Verificando se recording já está na playlist...");
    const existingItems = await sql`
      SELECT * FROM playlist_items
      WHERE playlist_id = ${playlistId} AND recording_id = ${recordingId}
    `;
    console.log("➕ [ADD TO PLAYLIST] Itens existentes:", existingItems.length);

    if (existingItems.length > 0) {
      return {
        success: false,
        error: "Recording already in playlist",
      };
    }

    // Get current max order
    console.log("➕ [ADD TO PLAYLIST] Obtendo max order...");
    const maxOrderResult = await sql`
      SELECT COALESCE(MAX("order"), -1) as max_order
      FROM playlist_items
      WHERE playlist_id = ${playlistId}
    `;
    console.log("➕ [ADD TO PLAYLIST] Max order result:", maxOrderResult);

    const maxOrder = maxOrderResult[0].max_order;
    const newOrder = maxOrder + 1;

    // Add recording to playlist
    console.log("➕ [ADD TO PLAYLIST] Inserindo item...");
    console.log("➕ [ADD TO PLAYLIST] playlist_id type:", typeof playlistId);
    console.log("➕ [ADD TO PLAYLIST] recording_id type:", typeof recordingId);
    console.log("➕ [ADD TO PLAYLIST] newOrder type:", typeof newOrder);
    const newItems = await sql`
      INSERT INTO playlist_items (playlist_id, recording_id, "order")
      VALUES (${playlistId}, ${recordingId}, ${newOrder})
      RETURNING *
    `;

    console.log("➕ [ADD TO PLAYLIST] ✅ Adicionado com sucesso!");

    return {
      success: true,
      playlistItem: newItems[0],
    };
  } catch (error) {
    console.error("➕ [ADD TO PLAYLIST] ❌ ERRO:", error);
    console.error("➕ [ADD TO PLAYLIST] ❌ ERRO message:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Failed to add recording to playlist",
    };
  }
}

/**
 * Remove a recording from a playlist
 */
export async function removeRecordingFromPlaylistAction(
  playlistId: string,
  recordingId: string,
) {
  console.log("➖ [REMOVE FROM PLAYLIST] Iniciando...");
  console.log("➖ [REMOVE FROM PLAYLIST] PlaylistId:", playlistId);
  console.log("➖ [REMOVE FROM PLAYLIST] RecordingId:", recordingId);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Verify playlist belongs to user
    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${playlistId} AND user_id = ${DEMO_USER_ID}
    `;

    if (playlists.length === 0) {
      return {
        success: false,
        error: "Playlist not found",
      };
    }

    // Remove recording from playlist
    await sql`
      DELETE FROM playlist_items
      WHERE playlist_id = ${playlistId} AND recording_id = ${recordingId}
    `;

    // Reorder remaining items
    await sql`
      WITH ordered_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "order") as new_order
        FROM playlist_items
        WHERE playlist_id = ${playlistId}
      )
      UPDATE playlist_items
      SET "order" = ordered_items.new_order
      FROM ordered_items
      WHERE playlist_items.id = ordered_items.id
    `;

    console.log("➖ [REMOVE FROM PLAYLIST] ✅ Removido com sucesso!");

    return {
      success: true,
    };
  } catch (error) {
    console.error("➖ [REMOVE FROM PLAYLIST] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to remove recording from playlist",
    };
  }
}

/**
 * Reorder playlist items (for drag-and-drop)
 */
export async function reorderPlaylistItemsAction(
  playlistId: string,
  itemIds: string[],
) {
  console.log("🔄 [REORDER PLAYLIST] Iniciando...");
  console.log("🔄 [REORDER PLAYLIST] PlaylistId:", playlistId);
  console.log("🔄 [REORDER PLAYLIST] ItemIds:", itemIds);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Verify playlist belongs to user
    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${playlistId} AND user_id = ${DEMO_USER_ID}
    `;

    if (playlists.length === 0) {
      return {
        success: false,
        error: "Playlist not found",
      };
    }

    // Update order for each item
    for (let i = 0; i < itemIds.length; i++) {
      await sql`
        UPDATE playlist_items
        SET "order" = ${i}
        WHERE id = ${itemIds[i]} AND playlist_id = ${playlistId}
      `;
    }

    console.log("🔄 [REORDER PLAYLIST] ✅ Reordenado com sucesso!");

    return {
      success: true,
    };
  } catch (error) {
    console.error("🔄 [REORDER PLAYLIST] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to reorder playlist items",
    };
  }
}

/**
 * Get all items in a playlist with recording details
 */
export async function getPlaylistItemsAction(playlistId: string) {
  console.log("📥 [GET PLAYLIST ITEMS] Iniciando...");
  console.log("📥 [GET PLAYLIST ITEMS] PlaylistId:", playlistId);
  console.log("📥 [GET PLAYLIST ITEMS] PlaylistId type:", typeof playlistId);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Verify playlist belongs to user
    console.log("📥 [GET PLAYLIST ITEMS] Verificando playlist...");
    const playlists = await sql`
      SELECT * FROM playlists WHERE id = ${playlistId} AND user_id = ${DEMO_USER_ID}
    `;
    console.log("📥 [GET PLAYLIST ITEMS] Playlists encontradas:", playlists.length);

    if (playlists.length === 0) {
      console.log("📥 [GET PLAYLIST ITEMS] ❌ Playlist não encontrada");
      return {
        success: false,
        error: "Playlist not found",
        items: [],
      };
    }

    console.log("📥 [GET PLAYLIST ITEMS] Buscando itens...");
    const items = await sql`
      SELECT
        pi.id as item_id,
        pi.playlist_id,
        pi.recording_id,
        pi."order",
        r.id as recording_id,
        r.user_id,
        r.title,
        r.video_key,
        r.camera_key,
        r.screen_key,
        r.thumbnail_key,
        r.thumbnail_url,
        r.duration,
        r.size,
        r.edit_config,
        r.created_at
      FROM playlist_items pi
      JOIN recordings r ON pi.recording_id = r.id
      WHERE pi.playlist_id = ${playlistId}
      ORDER BY pi."order"
    `;

    console.log("📥 [GET PLAYLIST ITEMS] Total encontrado:", items.length);

    return {
      success: true,
      items: items.map((item: any) => ({
        itemId: item.item_id,
        playlistId: item.playlist_id,
        recordingId: item.recording_id,
        order: item.order,
        recording: {
          id: item.recording_id,
          userId: item.user_id,
          title: item.title,
          videoKey: item.video_key,
          cameraKey: item.camera_key,
          screenKey: item.screen_key,
          thumbnailUrl: item.thumbnail_url,
          duration: item.duration,
          size: Number(item.size),
          editConfig: item.edit_config,
          createdAt: new Date(item.created_at).toISOString(),
        },
      })),
    };
  } catch (error) {
    console.error("📥 [GET PLAYLIST ITEMS] ❌ ERRO:", error);
    console.error("📥 [GET PLAYLIST ITEMS] ❌ ERRO message:", error instanceof Error ? error.message : "Unknown error");
    console.error("📥 [GET PLAYLIST ITEMS] ❌ ERRO stack:", error instanceof Error ? error.stack : "No stack trace");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch playlist items",
      items: [],
    };
  }
}

/**
 * Update playlist name
 */
export async function updatePlaylistNameAction(
  playlistId: string,
  name: string,
) {
  console.log("✏️ [UPDATE PLAYLIST NAME] Iniciando...");
  console.log("✏️ [UPDATE PLAYLIST NAME] PlaylistId:", playlistId);
  console.log("✏️ [UPDATE PLAYLIST NAME] Novo nome:", name);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const result = await sql`
      UPDATE playlists
      SET name = ${name}, updated_at = NOW()
      WHERE id = ${playlistId} AND user_id = ${DEMO_USER_ID}
      RETURNING id, name, updated_at
    `;

    console.log("✏️ [UPDATE PLAYLIST NAME] ✅ Nome atualizado com sucesso!");

    return {
      success: true,
      playlist: result[0],
    };
  } catch (error) {
    console.error("✏️ [UPDATE PLAYLIST NAME] ❌ ERRO:", error);
    return {
      success: false,
      error: "Failed to update playlist name",
    };
  }
}

/**
 * Get all playlists that contain a specific recording
 */
export async function getPlaylistsForRecordingAction(recordingId: string) {
  console.log("🎬 [GET PLAYLISTS FOR RECORDING] Iniciando...");
  console.log("🎬 [GET PLAYLISTS FOR RECORDING] RecordingId:", recordingId);

  try {
    const userId = await getOrCreateUser();
    console.log("🎬 [GET PLAYLISTS FOR RECORDING] Usuário autenticado:", userId);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const playlists = await sql`
      SELECT DISTINCT p.id, p.user_id, p.name, p.created_at, p.updated_at
      FROM playlists p
      JOIN playlist_items pi ON p.id = pi.playlist_id
      WHERE pi.recording_id = ${recordingId} AND p.user_id = ${userId}
      ORDER BY p.created_at DESC
    `;

    console.log("🎬 [GET PLAYLISTS FOR RECORDING] Total encontrado:", playlists.length);

    return {
      success: true,
      playlists: playlists.map((pl: any) => ({
        id: pl.id,
        userId: pl.user_id,
        name: pl.name,
        createdAt: new Date(pl.created_at).toISOString(),
        updatedAt: new Date(pl.updated_at).toISOString(),
      })),
    };
  } catch (error) {
    console.error("🎬 [GET PLAYLISTS FOR RECORDING] ❌ ERRO:", error);
    return {
      success: false,
      playlists: [],
    };
  }
}
