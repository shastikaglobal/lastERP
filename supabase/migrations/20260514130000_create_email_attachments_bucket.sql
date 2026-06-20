-- Create the storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read attachments (so they can be sent in emails)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'email-attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'email-attachments' AND auth.role() = 'authenticated');
