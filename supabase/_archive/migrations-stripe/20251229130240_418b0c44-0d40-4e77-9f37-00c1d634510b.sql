-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to view their receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their receipts
CREATE POLICY "Users can delete own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their receipts
CREATE POLICY "Users can update own receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);