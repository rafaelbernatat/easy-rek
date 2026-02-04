"use server";

import { neon } from "@neondatabase/serverless";

export async function migrateThumbnailKey() {
  console.log("🔧 [MIGRATION] Iniciando migração de thumbnail_key...");

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Add column if not exists
    await sql`
      ALTER TABLE recordings ADD COLUMN IF NOT EXISTS thumbnail_key TEXT
    `;

    console.log("🔧 [MIGRATION] ✅ Coluna thumbnail_key criada");

    // Update existing records
    await sql`
      UPDATE recordings
      SET thumbnail_key = SUBSTRING(thumbnail_url FROM '[^/]+$')
      WHERE thumbnail_url IS NOT NULL AND thumbnail_key IS NULL
    `;

    console.log("🔧 [MIGRATION] ✅ Registros existentes atualizados");

    return {
      success: true,
      message: "Migration completed successfully",
    };
  } catch (error) {
    console.error("🔧 [MIGRATION] ❌ ERRO:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function migratePlaylists() {
  console.log("🔧 [MIGRATION] Iniciando migração de playlists...");

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Create playlists table
    // Note: users.id is TEXT, so user_id must be TEXT
    await sql`
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `;

    console.log("🔧 [MIGRATION] ✅ Tabela playlists criada");

    // Create playlist_items table
    // Note: recordings.id is UUID, so recording_id must be UUID
    await sql`
      CREATE TABLE IF NOT EXISTS playlist_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `;

    console.log("🔧 [MIGRATION] ✅ Tabela playlist_items criada");

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_playlist_items_recording_id ON playlist_items(recording_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON playlist_items(playlist_id, "order")
    `;

    console.log("🔧 [MIGRATION] ✅ Índices criados");

    return {
      success: true,
      message: "Playlists migration completed successfully",
    };
  } catch (error) {
    console.error("🔧 [MIGRATION] ❌ ERRO:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
