import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(dbUrl);

  console.log('🔄 Executando migration: Criar tabela video_views...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS video_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        viewer_ip TEXT,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Tabela video_views criada');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_video_views_recording
      ON video_views(recording_id)
    `;
    console.log('✅ Índice idx_video_views_recording criado');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_video_views_date
      ON video_views(viewed_at)
    `;
    console.log('✅ Índice idx_video_views_date criado');

    console.log('🎉 Migration concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    process.exit(1);
  }
}

runMigration();
