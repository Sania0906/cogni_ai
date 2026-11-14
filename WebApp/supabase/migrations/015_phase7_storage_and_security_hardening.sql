-- MIGRATION 015: Phase 7 Profile & Auth Security Hardening (Non-Superuser SQL Editor Safe)
-- Non-destructive, idempotent, transaction-wrapped hardening migration for public.profiles.
-- Safe to run more than once in Supabase SQL Editor as the non-superuser 'postgres' role.
-- Preserves all 30 existing profile rows and avoids DDL on privileged supabase_auth_admin /
-- supabase_storage_admin tables.

BEGIN;

-- =========================================================================
-- NOTE ON SUPABASE STORAGE (storage.buckets / storage.objects):
-- Verified live ownership belongs to 'supabase_storage_admin', not 'postgres'.
-- The 'resumes' bucket is already private and already has owner-scoped SELECT,
-- INSERT, and DELETE policies on storage.objects. Do NOT drop those valid policies
-- or run storage DDL from SQL Editor as 'postgres'.
--
-- Manual Supabase Dashboard follow-up (Storage -> Policies on 'resumes'):
-- Add the missing UPDATE policy using the Dashboard's privileged storage role:
--   Policy name: Allow users to update their own resumes
--   Target role: authenticated
--   USING:       bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1]
--   WITH CHECK:  bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1]
-- =========================================================================

-- 1. Align public.profiles role CHECK constraint cleanly without dropping rows
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* '\yrole\y'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'organization', 'recruiter', 'admin'));

-- 2. Enable RLS, enforce least-privilege grants, owner RLS policies & role-escalation trigger
-- Verified live audit showed no existing constraints or RLS policies on public.profiles,
-- so RLS MUST be explicitly enabled here for owner policies to take effect.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow owners to update their profile" ON public.profiles;
CREATE POLICY "Allow owners to update their profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  claims_raw TEXT := NULLIF(TRIM(current_setting('request.jwt.claims', true)), '');
  claims_role TEXT := '';
  jwt_role TEXT;
  setting_role TEXT := LOWER(COALESCE(NULLIF(NULLIF(TRIM(current_setting('role', true)), ''), 'none'), ''));
  invoker_role TEXT := LOWER(COALESCE(NULLIF(setting_role, ''), current_user, ''));
  is_service_role BOOLEAN;
  is_direct_db_admin BOOLEAN;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Resolve JWT claim role across PostgREST GUC formats without falling back to unverified defaults.
  IF claims_raw IS NOT NULL THEN
    BEGIN
      claims_role := LOWER(COALESCE(NULLIF(TRIM(claims_raw::jsonb ->> 'role'), ''), ''));
    EXCEPTION WHEN OTHERS THEN
      claims_role := '';
    END;
  END IF;

  jwt_role := LOWER(COALESCE(
    NULLIF(TRIM(current_setting('request.jwt.claim.role', true)), ''),
    NULLIF(claims_role, ''),
    ''
  ));

  -- Case A: Verified Express backend service_role request over Supabase PostgREST.
  is_service_role := (
    jwt_role = 'service_role'
    AND invoker_role IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin')
  );

  -- Case B: Trusted direct SQL/migration/Supabase SQL Editor execution with no client JWT present.
  -- Fails closed for custom roles, anon/authenticated SET ROLE sessions, and client JWTs.
  is_direct_db_admin := (
    jwt_role = ''
    AND LOWER(current_user) IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
    AND invoker_role IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
  );

  IF NOT (is_service_role OR is_direct_db_admin) THEN
    RAISE EXCEPTION 'Insufficient privileges: profile role cannot be modified outside trusted service or database admin contexts.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 3. Schema-aligned public.handle_new_user() helper (no trigger DDL on auth.users).
-- IMPORTANT:
--   * No trigger is attached to auth.users here because auth.users is owned by
--     supabase_auth_admin and postgres is not a superuser. This function does NOT
--     execute automatically unless attached via a privileged role or Supabase Auth Hook.
--   * Active CognifyAI signups execute through Express /api/auth/signup using service_role.
--   * Columns match live public.profiles exactly (id, name, email, role); title, bio,
--     avatar, and location do not exist on public.profiles and are intentionally omitted.
--   * Never trusts client-supplied 'admin' metadata (maps 'organization'/'recruiter' to
--     'organization' and clamps all other inputs including 'admin' to 'user').
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role TEXT := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'user')));
  safe_role TEXT := CASE
    WHEN raw_role IN ('organization', 'recruiter') THEN 'organization'
    ELSE 'user'
  END;
  resolved_name TEXT := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
      NEW.id,
      resolved_name,
      NEW.email,
      safe_role
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
