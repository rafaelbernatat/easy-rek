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
