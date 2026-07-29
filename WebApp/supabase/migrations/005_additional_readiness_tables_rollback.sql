-- ROLLBACK FOR MIGRATION 005: Drop additional production readiness tables

DROP TRIGGER IF EXISTS update_user_courses_updated_at ON public.user_courses;
DROP TABLE IF EXISTS public.user_courses CASCADE;

DROP TRIGGER IF EXISTS update_employability_scores_updated_at ON public.employability_scores;
DROP TABLE IF EXISTS public.employability_scores CASCADE;

DROP TRIGGER IF EXISTS update_career_dna_updated_at ON public.career_dna;
DROP TABLE IF EXISTS public.career_dna CASCADE;

DROP TRIGGER IF EXISTS update_academic_details_updated_at ON public.academic_details;
DROP TABLE IF EXISTS public.academic_details CASCADE;

-- Note: We do not drop resumes columns in rollback to prevent potential data loss.
