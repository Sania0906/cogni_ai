-- MIGRATION 007: Consolidated Schema Fix
-- Target: Supabase / Postgres Database
-- Run this in your Supabase SQL Editor to establish all missing tables and realign mismatched tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean drop of existing tables to ensure clean schema realignment (with CASCADE to handle dependencies)
DROP TABLE IF EXISTS public.applied_jobs CASCADE;
DROP TABLE IF EXISTS public.user_courses CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.resumes CASCADE;
DROP TABLE IF EXISTS public.ats_reports CASCADE;
DROP TABLE IF EXISTS public.career_recommendations CASCADE;
DROP TABLE IF EXISTS public.learning_roadmaps CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.market_insights CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.academic_details CASCADE;
DROP TABLE IF EXISTS public.career_dna CASCADE;
DROP TABLE IF EXISTS public.employability_scores CASCADE;

-- Ensure profiles table has correct onboarding flag and default values
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- =========================================================================
-- 1. COURSES TABLE (Aligned: TEXT ID for custom matching, includes author)
-- =========================================================================
CREATE TABLE public.courses (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  weeks INTEGER NOT NULL CHECK (weeks > 0),
  rating NUMERIC NOT NULL DEFAULT 5.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  students TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Allow admins to write courses" ON public.courses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- =========================================================================
-- 2. JOBS TABLE (TEXT ID for custom matching)
-- =========================================================================
CREATE TABLE public.jobs (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  loc TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Full-time',
  salary TEXT NOT NULL,
  match INTEGER NOT NULL DEFAULT 0 CHECK (match >= 0 AND match <= 100),
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow admins to write jobs" ON public.jobs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- =========================================================================
-- 3. USER COURSES TABLE
-- =========================================================================
CREATE TABLE public.user_courses (
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
CREATE POLICY "Users can view their own enrolled courses" ON public.user_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own enrolled courses" ON public.user_courses FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_courses_user_id ON public.user_courses(user_id);

-- =========================================================================
-- 4. CERTIFICATES TABLE
-- =========================================================================
CREATE TABLE public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  certificate_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to write certificates" ON public.certificates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- =========================================================================
-- 5. RECOMMENDATIONS TABLE
-- =========================================================================
CREATE TABLE public.recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'job')),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_recommendations_user_id ON public.recommendations(user_id);

-- =========================================================================
-- 6. SUBSCRIPTIONS TABLE
-- =========================================================================
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Pro', 'Enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert their own subscription" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 7. RESUMES TABLE
-- =========================================================================
CREATE TABLE public.resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
  skills TEXT[] DEFAULT '{}'::TEXT[],
  education TEXT DEFAULT '',
  certifications TEXT[] DEFAULT '{}'::TEXT[],
  improvements TEXT[] DEFAULT '{}'::TEXT[],
  parsed_text TEXT DEFAULT '',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own resume" ON public.resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own resume" ON public.resumes FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 8. ATS REPORTS TABLE
-- =========================================================================
CREATE TABLE public.ats_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  strengths TEXT[] DEFAULT '{}'::TEXT[],
  weaknesses TEXT[] DEFAULT '{}'::TEXT[],
  recommendations TEXT[] DEFAULT '{}'::TEXT[],
  missing_keywords TEXT[] DEFAULT '{}'::TEXT[],
  extracted_skills TEXT[] DEFAULT '{}'::TEXT[],
  resume_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.ats_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ATS reports" ON public.ats_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can write their own ATS reports" ON public.ats_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ats_reports_user_id ON public.ats_reports(user_id);

-- =========================================================================
-- 9. CAREER RECOMMENDATIONS TABLE
-- =========================================================================
CREATE TABLE public.career_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  reason TEXT NOT NULL,
  salary_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own career recommendations" ON public.career_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can write their own career recommendations" ON public.career_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_career_rec_user_id ON public.career_recommendations(user_id);

-- =========================================================================
-- 10. LEARNING ROADMAPS TABLE
-- =========================================================================
CREATE TABLE public.learning_roadmaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.learning_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own learning roadmaps" ON public.learning_roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can write their own learning roadmaps" ON public.learning_roadmaps FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_learning_roadmaps_user_id ON public.learning_roadmaps(user_id);

-- =========================================================================
-- 11. CHAT HISTORY TABLE
-- =========================================================================
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chat history" ON public.chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can write their own chat history" ON public.chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);

-- =========================================================================
-- 12. USER ACTIVITY LOG TABLE
-- =========================================================================
CREATE TABLE public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own activity logs" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity logs" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);

-- =========================================================================
-- 13. AI INSIGHTS CACHE TABLE
-- =========================================================================
CREATE TABLE public.ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  insight TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI insights" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);

-- =========================================================================
-- 14. MARKET INSIGHTS TABLE
-- =========================================================================
CREATE TABLE public.market_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  growth_rate NUMERIC NOT NULL,
  average_salary NUMERIC NOT NULL,
  openings_count INTEGER NOT NULL,
  market_drivers TEXT[] DEFAULT '{}'::TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to market insights" ON public.market_insights FOR SELECT USING (true);

-- =========================================================================
-- 15. CERTIFICATIONS TABLE (Completed by user)
-- =========================================================================
CREATE TABLE public.certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE,
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own certifications" ON public.certifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own certifications" ON public.certifications FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_certifications_user_id ON public.certifications(user_id);

-- =========================================================================
-- 16. PROJECTS TABLE
-- =========================================================================
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  technologies TEXT[] DEFAULT '{}'::TEXT[],
  project_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- =========================================================================
-- 17. ACADEMIC DETAILS TABLE
-- =========================================================================
CREATE TABLE public.academic_details (
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
CREATE POLICY "Users can view their own academic details" ON public.academic_details FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own academic details" ON public.academic_details FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_academic_details_user_id ON public.academic_details(user_id);

-- =========================================================================
-- 18. CAREER DNA TABLE
-- =========================================================================
CREATE TABLE public.career_dna (
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
CREATE POLICY "Users can view their own career DNA" ON public.career_dna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own career DNA" ON public.career_dna FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_career_dna_user_id ON public.career_dna(user_id);

-- =========================================================================
-- 19. EMPLOYABILITY SCORES TABLE
-- =========================================================================
CREATE TABLE public.employability_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  components JSONB NOT NULL DEFAULT '[]'::JSONB,
  feedback TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.employability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own employability score" ON public.employability_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own employability score" ON public.employability_scores FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_employability_scores_user_id ON public.employability_scores(user_id);

-- =========================================================================
-- 20. APPLIED JOBS TABLE
-- =========================================================================
CREATE TABLE public.applied_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Interview', 'Offer', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.applied_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own applied jobs" ON public.applied_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own applied jobs" ON public.applied_jobs FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_applied_jobs_user_id ON public.applied_jobs(user_id);

-- =========================================================================
-- STORAGE BUCKET CONFIGURATION
-- =========================================================================
-- Ensure resumes bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Configure storage policies
DROP POLICY IF EXISTS "Allow users to upload their own resumes" ON storage.objects;
CREATE POLICY "Allow users to upload their own resumes" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to view their own resumes" ON storage.objects;
CREATE POLICY "Allow users to view their own resumes" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to delete their own resumes" ON storage.objects;
CREATE POLICY "Allow users to delete their own resumes" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resumes' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- =========================================================================
-- TIMESTAMP UPDATES HELPER FUNCTIONS & TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_user_courses_updated_at BEFORE UPDATE ON public.user_courses FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.recommendations FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_academic_details_updated_at BEFORE UPDATE ON public.academic_details FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_career_dna_updated_at BEFORE UPDATE ON public.career_dna FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_employability_scores_updated_at BEFORE UPDATE ON public.employability_scores FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_applied_jobs_updated_at BEFORE UPDATE ON public.applied_jobs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
