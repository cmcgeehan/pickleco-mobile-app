-- Enable RLS on storage.objects (may already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload to their own folder in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read user-images" ON storage.objects;

-- 1. Allow users to upload their own profile image (userId.ext format)
CREATE POLICY "Users can upload their own profile image in user-images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid() IS NOT NULL
    AND name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|webp|gif)$')
);

-- 2. Allow users to update their own profile image
CREATE POLICY "Users can update their own profile image in user-images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'user-images' 
    AND auth.uid() IS NOT NULL
    AND name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|webp|gif)$')
)
WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid() IS NOT NULL
    AND name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|webp|gif)$')
);

-- 3. Allow users to delete their own profile image
CREATE POLICY "Users can delete their own profile image in user-images"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'user-images' 
    AND auth.uid() IS NOT NULL
    AND name ~ ('^' || auth.uid()::text || '\.(jpg|jpeg|png|webp|gif)$')
);

-- 4. Allow public read access to all files in user-images bucket
CREATE POLICY "Public can read user-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-images');

-- Verify policies were created
SELECT 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname ILIKE '%user-images%'
ORDER BY policyname;
