-- Migration: Add transcode and streaming upload fields to recordings table
-- Run against Neon PostgreSQL

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS transcode_status TEXT,
  ADD COLUMN IF NOT EXISTS transcode_error TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_720p TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_1080p TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_4k TEXT,
  ADD COLUMN IF NOT EXISTS raw_key TEXT,
  ADD COLUMN IF NOT EXISTS upload_status TEXT,
  ADD COLUMN IF NOT EXISTS upload_id TEXT;

CREATE INDEX IF NOT EXISTS idx_recordings_transcode_status
  ON recordings(transcode_status)
  WHERE transcode_status IN ('pending', 'processing');
