-- ROLLBACK FOR MIGRATION 004: Storage Policies and Buckets Teardown
-- Target: Supabase / Postgres Database

DROP POLICY IF EXISTS "Allow users to delete their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload their own resumes" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'resumes';
