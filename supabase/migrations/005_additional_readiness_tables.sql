-- MIGRATION 005: Additional Production Readiness Tables
-- Target: Supabase / Postgres Database

-- 1. Alter resumes table to add file_name and file_url if they are not already there
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. Create Academic Details table
CREATE TABLE IF NOT EXISTS public.academic_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  degree TEXT NOT NULL,
  department TEXT,
  college TEXT NOT NULL,
  grad_year INTEGER,
  cgpa NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.academic_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own academic details" 
  ON public.academic_details FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own academic details" 
  ON public.academic_details FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_academic_details_user_id ON public.academic_details(user_id);

-- Trigger for auto-updating timestamps on academic_details Changes
CREATE OR REPLACE TRIGGER update_academic_details_updated_at
  BEFORE UPDATE ON public.academic_details
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3. Create Career DNA table
CREATE TABLE IF NOT EXISTS public.career_dna (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  archetype TEXT NOT NULL,
  tagline TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]'::JSONB,
  strengths TEXT[] DEFAULT '{}'::TEXT[],
  weaknesses TEXT[] DEFAULT '{}'::TEXT[],
  recommended_environments TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.career_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own career DNA" 
  ON public.career_dna FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own career DNA" 
  ON public.career_dna FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_career_dna_user_id ON public.career_dna(user_id);

CREATE OR REPLACE TRIGGER update_career_dna_updated_at
  BEFORE UPDATE ON public.career_dna
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. Create Employability Scores table
CREATE TABLE IF NOT EXISTS public.employability_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  components JSONB NOT NULL DEFAULT '[]'::JSONB,
  feedback TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.employability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own employability score" 
  ON public.employability_scores FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own employability score" 
  ON public.employability_scores FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_employability_scores_user_id ON public.employability_scores(user_id);

CREATE OR REPLACE TRIGGER update_employability_scores_updated_at
  BEFORE UPDATE ON public.employability_scores
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 5. Create User Courses (enrollment and progress tracking)
CREATE TABLE IF NOT EXISTS public.user_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_lessons INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 12,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrolled courses" 
  ON public.user_courses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own enrolled courses" 
  ON public.user_courses FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);

CREATE OR REPLACE TRIGGER update_user_courses_updated_at
  BEFORE UPDATE ON public.user_courses
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
