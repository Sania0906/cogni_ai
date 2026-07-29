-- ROLLBACK FOR MIGRATION 003: Advanced Tables Teardown
-- Target: Supabase / Postgres Database

DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.market_insights CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.learning_roadmaps CASCADE;
DROP TABLE IF EXISTS public.career_recommendations CASCADE;
DROP TABLE IF EXISTS public.ats_reports CASCADE;
