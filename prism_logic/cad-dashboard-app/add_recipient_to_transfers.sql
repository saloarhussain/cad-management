-- Add recipient and downloads column to file_transfers table
ALTER TABLE file_transfers ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE file_transfers ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;
