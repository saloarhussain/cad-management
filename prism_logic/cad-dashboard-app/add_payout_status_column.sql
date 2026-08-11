-- Add payoutStatus column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "payoutStatus" text DEFAULT 'PENDING';

-- Reload schema cache to apply changes immediately
NOTIFY pgrst, 'reload schema';
