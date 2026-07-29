-- Drop unique constraint from resumes table to allow history
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_user_id_key;

-- Company Readiness Table
create table if not exists public.company_readiness (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_name text not null,
  target_role text not null,
  readiness_score integer not null,
  cultural_fit integer not null,
  technical_fit integer not null,
  gaps text[] default '{}'::text[],
  recommendations text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.company_readiness enable row level security;
create policy "Users can view their own company readiness" on public.company_readiness for select using (auth.uid() = user_id);
create policy "Users can write their own company readiness" on public.company_readiness for all using (auth.uid() = user_id);

-- Career Twin Table
create table if not exists public.career_twin (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  personality text not null,
  strengths text[] default '{}'::text[],
  weaknesses text[] default '{}'::text[],
  recommended_roles text[] default '{}'::text[],
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.career_twin enable row level security;
create policy "Users can view their own career twin" on public.career_twin for select using (auth.uid() = user_id);
create policy "Users can write their own career twin" on public.career_twin for all using (auth.uid() = user_id);

-- AI Interviews Table
create table if not exists public.ai_interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company text not null,
  role text not null,
  questions jsonb not null default '[]'::jsonb,
  score integer,
  feedback text,
  completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_interviews enable row level security;
create policy "Users can view their own ai interviews" on public.ai_interviews for select using (auth.uid() = user_id);
create policy "Users can write their own ai interviews" on public.ai_interviews for all using (auth.uid() = user_id);
