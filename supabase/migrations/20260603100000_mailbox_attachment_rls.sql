-- Backend Enforcement for Email Attachment Downloads
-- Only Admin and Manager roles are permitted to download (SELECT) files from email-attachments.

-- Ensure RLS is enabled on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remove any existing permissive SELECT policy for this specific bucket if needed
-- (Uncomment below if there is an existing overlapping policy)
-- DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- Create the restricted SELECT policy
CREATE POLICY "Allow attachment downloads for Admin and Manager" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'email-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND lower(requested_role) IN ('admin', 'manager')
  )
);
