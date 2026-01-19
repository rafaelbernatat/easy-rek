-- Add camera_key and screen_key columns to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS camera_key TEXT,
ADD COLUMN IF NOT EXISTS screen_key TEXT;
