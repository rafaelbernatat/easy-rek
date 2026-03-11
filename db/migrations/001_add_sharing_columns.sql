-- Adicionar colunas de compartilhamento à tabela recordings

-- 1. Adicionar sharing_enabled
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT false;

-- 2. Adicionar sharing_access
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS sharing_access TEXT DEFAULT 'public';

-- 3. Adicionar sharing_password
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS sharing_password TEXT;

-- 4. Adicionar allow_download
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT true;

-- 5. Adicionar sharing_slug
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS sharing_slug TEXT;

-- 6. Criar índice único para sharing_slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_sharing_slug ON recordings(sharing_slug) WHERE sharing_slug IS NOT NULL;

-- 7. Criar índice para sharing_enabled
CREATE INDEX IF NOT EXISTS idx_recordings_sharing_enabled ON recordings(sharing_enabled) WHERE sharing_enabled = true;
