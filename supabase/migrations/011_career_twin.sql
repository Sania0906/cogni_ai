-- Migration: Career Twin Table
create table if not exists public.career_twin_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  personality text not null,
  technical_score integer not null check (technical_score >= 0 and technical_score <= 100),
  soft_skills_score integer not null check (soft_skills_score >= 0 and soft_skills_score <= 100),
  leadership_potential integer not null check (leadership_potential >= 0 and leadership_potential <= 100),
  communication_score integer not null check (communication_score >= 0 and communication_score <= 100),
  problem_solving_score integer not null check (problem_solving_score >= 0 and problem_solving_score <= 100),
  learning_ability integer not null check (learning_ability >= 0 and learning_ability <= 100),
  maturity_level text not null,
  top_strengths text[] not null default '{}'::text[],
  improvement_areas text[] not null default '{}'::text[],
  predicted_paths text[] not null default '{}'::text[],
  growth_suggestions text[] not null default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.career_twin_reports enable row level security;

-- Policies
create policy "Users can view their own career twin reports" on public.career_twin_reports
  for select using (auth.uid() = user_id);

create policy "Users can insert their own career twin reports" on public.career_twin_reports
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own career twin reports" on public.career_twin_reports
  for update using (auth.uid() = user_id);

create policy "Users can delete their own career twin reports" on public.career_twin_reports
  for delete using (auth.uid() = user_id);
