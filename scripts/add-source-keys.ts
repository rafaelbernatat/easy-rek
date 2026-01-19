import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("🔄 Adicionando colunas camera_key e screen_key...");

  try {
    await sql`
      ALTER TABLE recordings 
      ADD COLUMN IF NOT EXISTS camera_key TEXT,
      ADD COLUMN IF NOT EXISTS screen_key TEXT
    `;

    console.log("✅ Migration concluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro na migration:", error);
    process.exit(1);
  }
}

migrate();
