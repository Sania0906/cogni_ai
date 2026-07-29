-- Migration: Company Readiness Analysis Table
create table if not exists public.company_readiness_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_name text not null,
  target_role text not null,
  readiness_score integer not null check (readiness_score >= 0 and readiness_score <= 100),
  missing_skills jsonb not null default '{"technical": [], "soft": [], "certifications": [], "projects": []}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.company_readiness_reports enable row level security;

-- Policies
create policy "Users can view their own company readiness reports" on public.company_readiness_reports
  for select using (auth.uid() = user_id);

create policy "Users can insert their own company readiness reports" on public.company_readiness_reports
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own company readiness reports" on public.company_readiness_reports
  for update using (auth.uid() = user_id);

create policy "Users can delete their own company readiness reports" on public.company_readiness_reports
  for delete using (auth.uid() = user_id);
