-- ==============================================================================
-- Migration: Add GST Invoice Fields, Cancellation Tracking, & Atomic Sequence
-- Cadonce Web App (cadonce.com)
-- ==============================================================================

-- 1. Add Source & Reference Columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'Direct',
ADD COLUMN IF NOT EXISTS "source_ref" text,
ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
ADD COLUMN IF NOT EXISTS "cancellation_reason" text;

-- 2. Create Atomic GST Sequence Table
CREATE TABLE IF NOT EXISTS public.gst_invoice_sequences (
    fy text PRIMARY KEY,
    last_serial integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS and grant access
ALTER TABLE public.gst_invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gst_invoice_sequences' AND policyname = 'Allow access to authenticated users on gst_invoice_sequences'
    ) THEN
        CREATE POLICY "Allow access to authenticated users on gst_invoice_sequences" 
        ON public.gst_invoice_sequences FOR ALL 
        TO authenticated, service_role 
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Create Atomic Function for Thread-Safe Invoice Number Generation
CREATE OR REPLACE FUNCTION public.get_next_gst_invoice_number(p_fy text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_num integer;
    formatted_id text;
BEGIN
    INSERT INTO public.gst_invoice_sequences (fy, last_serial, updated_at)
    VALUES (p_fy, 1, now())
    ON CONFLICT (fy) DO UPDATE
    SET last_serial = gst_invoice_sequences.last_serial + 1,
        updated_at = now()
    RETURNING last_serial INTO next_num;

    formatted_id := 'MC/' || p_fy || '/' || lpad(next_num::text, 4, '0');
    RETURN formatted_id;
END;
$$;

-- 4. Initialize Sequence Table with Highest Existing MC Serials
DO $$
DECLARE
    rec RECORD;
    max_s integer;
BEGIN
    FOR rec IN
        SELECT DISTINCT substring("orderId" from 'MC/([0-9]{2}-[0-9]{2})/[0-9]+') as fy
        FROM public.projects
        WHERE "orderId" ~* '^MC/[0-9]{2}-[0-9]{2}/[0-9]+'
    LOOP
        IF rec.fy IS NOT NULL THEN
            SELECT COALESCE(MAX(CAST(substring("orderId" from 'MC/[0-9]{2}-[0-9]{2}/([0-9]+)') AS integer)), 0)
            INTO max_s
            FROM public.projects
            WHERE "orderId" ~* ('^MC/' || rec.fy || '/[0-9]+');

            INSERT INTO public.gst_invoice_sequences (fy, last_serial, updated_at)
            VALUES (rec.fy, max_s, now())
            ON CONFLICT (fy) DO UPDATE
            SET last_serial = GREATEST(gst_invoice_sequences.last_serial, max_s);
        END IF;
    END LOOP;
END $$;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
