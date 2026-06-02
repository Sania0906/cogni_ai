-- MIGRATION 008: Resume-Driven Intelligence Schema Adjustments
-- Target: Supabase / Postgres Database
-- Adds projects and experience fields to the resumes table for complete single-source-of-truth storage.

ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS projects TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS experience TEXT[] DEFAULT '{}'::TEXT[];

-- Ensure indices are optimized
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
