-- Add watermark_enabled column to file_transfers table
ALTER TABLE file_transfers ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE;
