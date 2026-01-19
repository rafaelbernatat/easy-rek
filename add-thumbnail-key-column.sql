-- Add thumbnail_key column to recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS thumbnail_key TEXT;

-- Update existing records: extract thumbnail_key from thumbnail_url
UPDATE recordings 
SET thumbnail_key = SUBSTRING(thumbnail_url FROM '[^/]+$')
WHERE thumbnail_url IS NOT NULL AND thumbnail_key IS NULL;
