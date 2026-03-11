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

  console.log('🔄 Executando migration: Adicionar colunas de sharing...');

  try {
    // 1. Adicionar sharing_enabled
    await sql`
      ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT false
    `;
    console.log('✅ sharing_enabled adicionado');

    // 2. Adicionar sharing_access
    await sql`
      ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS sharing_access TEXT DEFAULT 'public'
    `;
    console.log('✅ sharing_access adicionado');

    // 3. Adicionar sharing_password
    await sql`
      ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS sharing_password TEXT
    `;
    console.log('✅ sharing_password adicionado');

    // 4. Adicionar allow_download
    await sql`
      ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT true
    `;
    console.log('✅ allow_download adicionado');

    // 5. Adicionar sharing_slug
    await sql`
      ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS sharing_slug TEXT
    `;
    console.log('✅ sharing_slug adicionado');

    // 6. Criar índice único para sharing_slug
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_sharing_slug
      ON recordings(sharing_slug)
      WHERE sharing_slug IS NOT NULL
    `;
    console.log('✅ Índice idx_recordings_sharing_slug criado');

    // 7. Criar índice para sharing_enabled
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recordings_sharing_enabled
      ON recordings(sharing_enabled)
      WHERE sharing_enabled = true
    `;
    console.log('✅ Índice idx_recordings_sharing_enabled criado');

    console.log('🎉 Migration concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    process.exit(1);
  }
}

runMigration();
