-- MIGRATION 015: Phase 7 Storage Privacy & Auth Trigger Hardening
-- Non-destructive hardening migration. Safe to run in Supabase SQL Editor.
-- Does NOT drop tables or remove existing user/platform records.

-- 1. Enforce private access on the resumes storage bucket even if previously created public
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Enforce owner-scoped storage RLS policies for authenticated users inside {uid}/ prefixes
DROP POLICY IF EXISTS "Allow users to upload their own resumes" ON storage.objects;
CREATE POLICY "Allow users to upload their own resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to view their own resumes" ON storage.objects;
CREATE POLICY "Allow users to view their own resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to update their own resumes" ON storage.objects;
CREATE POLICY "Allow users to update their own resumes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to delete their own resumes" ON storage.objects;
CREATE POLICY "Allow users to delete their own resumes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. Restrict direct client SELECT on profiles to authenticated owners (service_role bypasses RLS for Express API)
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 4. Harden auth signup trigger so raw user_metadata can never self-assign the 'admin' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role TEXT := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'user'));
  safe_role TEXT := CASE
    WHEN raw_role IN ('organization', 'recruiter') THEN 'organization'
    ELSE 'user'
  END;
BEGIN
  INSERT INTO public.profiles (id, name, email, role, title, bio, avatar, location)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    safe_role,
    'Professional',
    '',
    '',
    'Remote'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

