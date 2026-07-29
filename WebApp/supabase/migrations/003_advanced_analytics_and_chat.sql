-- MIGRATION 003: Advanced Analytics, Market Insights, Chatbot & Projects
-- Target: Supabase / Postgres Database
-- Author: Senior Full Stack Architect & Supabase Specialist

-- =========================================================================
-- 1. ATS REPORTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ats_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  strengths TEXT[] DEFAULT '{}'::TEXT[],
  weaknesses TEXT[] DEFAULT '{}'::TEXT[],
  recommendations TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.ats_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ATS reports" 
  ON public.ats_reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can write their own ATS reports" 
  ON public.ats_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ats_reports_user_id ON public.ats_reports(user_id);

-- =========================================================================
-- 2. CAREER RECOMMENDATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.career_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  reason TEXT NOT NULL,
  salary_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own career recommendations" 
  ON public.career_recommendations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can write their own career recommendations" 
  ON public.career_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_career_rec_user_id ON public.career_recommendations(user_id);

-- =========================================================================
-- 3. LEARNING ROADMAPS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.learning_roadmaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.learning_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning roadmaps" 
  ON public.learning_roadmaps FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can write their own learning roadmaps" 
  ON public.learning_roadmaps FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user_id ON public.learning_roadmaps(user_id);

-- =========================================================================
-- 4. CHAT HISTORY TABLE (Used by dynamic backend chat logs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history" 
  ON public.chat_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can write their own chat history" 
  ON public.chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);

-- =========================================================================
-- 5. USER ACTIVITY LOG TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" 
  ON public.user_activity FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs" 
  ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);

-- =========================================================================
-- 6. AI INSIGHTS CACHE TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  insight TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI insights" 
  ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);

-- =========================================================================
-- 7. MARKET INSIGHTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.market_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  growth_rate NUMERIC NOT NULL,
  average_salary NUMERIC NOT NULL,
  openings_count INTEGER NOT NULL,
  market_drivers TEXT[] DEFAULT '{}'::TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to market insights" 
  ON public.market_insights FOR SELECT USING (true);

CREATE TRIGGER update_market_insights_updated_at
  BEFORE UPDATE ON public.market_insights
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =========================================================================
-- 8. CERTIFICATIONS TABLE (References profile directly, e.g. for external certs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE,
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certifications" 
  ON public.certifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own certifications" 
  ON public.certifications FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON public.certifications(user_id);

-- =========================================================================
-- 9. PROJECTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  technologies TEXT[] DEFAULT '{}'::TEXT[],
  project_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects" 
  ON public.projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own projects" 
  ON public.projects FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
