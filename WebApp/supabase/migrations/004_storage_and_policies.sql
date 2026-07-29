-- MIGRATION 004: Supabase Storage Buckets & Policies
-- Target: Supabase / Postgres Database
-- Author: Senior Full Stack Architect & Supabase Specialist

-- 1. Create a resumes bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Configure Row Level Security (RLS) policies for the storage objects table

-- Allow users to insert their own files in the resumes bucket
-- Files should be stored inside folders matching their authenticated User ID
CREATE POLICY "Allow users to upload their own resumes" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow users to read their own files in the resumes bucket
CREATE POLICY "Allow users to view their own resumes" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files in the resumes bucket
CREATE POLICY "Allow users to delete their own resumes" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );
