-- Create the storage bucket for team chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read chat attachments
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload chat attachments
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
