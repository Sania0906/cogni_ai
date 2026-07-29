-- Migration to align ats_reports with data-flow audit requirements
ALTER TABLE public.ats_reports 
ADD COLUMN IF NOT EXISTS missing_keywords text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS extracted_skills text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS resume_url text;
