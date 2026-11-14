-- ROLLBACK FOR MIGRATION 015: Safe Non-Destructive Security Hardening Teardown
-- Target: Supabase / Postgres Database (runs as 'postgres' in SQL Editor)
-- Preserves all public.profiles rows, existing data, and keeps profiles_role_check
-- if organization/recruiter rows exist in the live table.

BEGIN;

-- 1. Remove role-escalation protection trigger & helper functions added by Migration 015
DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_role_escalation();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Remove the RLS policies created by Migration 015 on public.profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow owners to update their profile" ON public.profiles;

-- Note:
--   * Verify before re-opening any grants that no sensitive user PII is exposed.
--   * Live audit confirmed RLS was already enabled on public.profiles pre-015 with
--     FORCE RLS disabled; this rollback intentionally keeps RLS enabled and does NOT
--     restore broad anon/authenticated table grants automatically.
--   * Note that dropping 015's two RLS policies while leaving RLS enabled denies all
--     authenticated PostgREST client access until replacement RLS policies are created
--     (matching the pre-015 zero-policy RLS state while keeping Express service_role working).
--   * Do NOT narrow profiles_role_check back to ('user', 'admin') while organization accounts exist.
--   * If an UPDATE policy was added in Supabase Dashboard -> Storage -> Policies, remove only that
--     UPDATE policy in the Dashboard UI; do NOT drop existing SELECT/INSERT/DELETE policies.

COMMIT;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                