-- =====================================================
-- Add empresa_logo_url Field and Create Storage Bucket
-- =====================================================

-- Step 1: Add empresa_logo_url column to usuarios table
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS empresa_logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.usuarios.empresa_logo_url IS 
  'URL to company logo stored in Supabase Storage (company-logos bucket)';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
  AND column_name = 'empresa_logo_url';

-- =====================================================
-- Step 2: Create Storage Bucket (Run in Supabase Dashboard)
-- =====================================================
-- 
-- Go to: Storage → Create new bucket
-- 
-- Bucket Configuration:
-- - Name: company-logos
-- - Public bucket: YES (enable public access)
-- - Allowed MIME types: image/png, image/jpeg, image/jpg
-- - File size limit: 2MB (2097152 bytes)
-- 
-- Or use SQL:
-- 
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'company-logos',
--   'company-logos',
--   true,
--   2097152,
--   ARRAY['image/png', 'image/jpeg', 'image/jpg']
-- );
-- 
-- =====================================================
-- Step 3: Set Storage Policies (Public Read Access)
-- =====================================================

-- Allow public read access to company logos
CREATE POLICY IF NOT EXISTS "Public read access for company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload their own logos
CREATE POLICY IF NOT EXISTS "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own logos
CREATE POLICY IF NOT EXISTS "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own logos
CREATE POLICY IF NOT EXISTS "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'company-logos';

-- Check storage policies
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%company logos%';

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- File Structure in Storage:
-- company-logos/
--   ├── {user_id}/
--   │   └── logo.png
--   ├── {user_id}/
--   │   └── logo.jpg
-- 
-- URL Format:
-- https://{project}.supabase.co/storage/v1/object/public/company-logos/{user_id}/logo.png
-- 
-- Supported Formats:
-- - PNG (image/png)
-- - JPEG (image/jpeg)
-- - JPG (image/jpg)
-- 
-- Size Limits:
-- - Max file size: 2MB
-- - Recommended display: 100x100px in invoices
-- - Max display: 200x200px in profile
-- 
-- =====================================================


