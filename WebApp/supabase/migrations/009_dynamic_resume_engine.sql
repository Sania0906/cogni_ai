-- 1. Drop the unique constraint on user_id so users can upload multiple resumes
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_user_id_key;

-- 2. Add dynamic fields extracted from the resume
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'::text[];

-- 3. Update the profiles table to allow automatic syncing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
