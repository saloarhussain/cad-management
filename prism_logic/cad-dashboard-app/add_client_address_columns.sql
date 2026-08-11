-- Add billing & address columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS "taxId" text,
ADD COLUMN IF NOT EXISTS "address" text,
ADD COLUMN IF NOT EXISTS "city" text,
ADD COLUMN IF NOT EXISTS "state" text,
ADD COLUMN IF NOT EXISTS "pincode" text;

-- Reload schema cache to apply changes immediately
NOTIFY pgrst, 'reload schema';
