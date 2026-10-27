-- Create file_transfer_payments table to track manual payments
CREATE TABLE IF NOT EXISTS file_transfer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES file_transfers(id) ON DELETE CASCADE,
    buyer_email TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_id TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE file_transfer_payments ENABLE ROW LEVEL SECURITY;

-- Allow service role and administrators full access
CREATE POLICY "Enable all access for service role and admin" 
ON file_transfer_payments FOR ALL USING (true);

-- Allow public insert access so buyers can submit receipts
CREATE POLICY "Enable public inserts for buyers"
ON file_transfer_payments FOR INSERT
WITH CHECK (true);

-- Allow public select access so buyers can verify payment status
CREATE POLICY "Enable public select for buyers"
ON file_transfer_payments FOR SELECT
USING (true);
