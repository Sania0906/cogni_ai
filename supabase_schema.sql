-- SQL DDL Schema for CognifyAI Supabase Migration

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. PROFILES TABLE
-- =========================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  title text not null default 'Professional',
  bio text not null default '',
  avatar text not null default '',
  location text not null default 'Remote',
  degree text,
  department text,
  college text,
  grad_year integer,
  cgpa numeric,
  interests text[] default '{}'::text[],
  linkedin_url text,
  github_url text,
  resume_url text,
  onboarding_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow owners to update their profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, title, bio, avatar, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    'Professional',
    '',
    '',
    'Remote'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- 2. SKILLS TABLE
-- =========================================================================
create table public.skills (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  level text not null default 'Intermediate' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.skills enable row level security;

-- Skills Policies
create policy "Users can view their own skills" on public.skills
  for select using (auth.uid() = user_id);

create policy "Users can insert their own skills" on public.skills
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own skills" on public.skills
  for update using (auth.uid() = user_id);

create policy "Users can delete their own skills" on public.skills
  for delete using (auth.uid() = user_id);


-- =========================================================================
-- 3. COURSES TABLE
-- =========================================================================
create table public.courses (
  id text default gen_random_uuid()::text primary key, -- Use text to maintain course_1 compatibility
  title text not null,
  author text not null,
  tags text[] default '{}'::text[],
  weeks integer not null check (weeks > 0),
  rating numeric not null default 5.0 check (rating >= 0.0 and rating <= 5.0),
  students text not null default '0',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.courses enable row level security;

-- Courses Policies
create policy "Allow public read access to courses" on public.courses
  for select using (true);

create policy "Allow admins to write courses" on public.courses
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- =========================================================================
-- 4. CERTIFICATES TABLE
-- =========================================================================
create table public.certificates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id text references public.courses(id) on delete cascade not null,
  issue_date timestamp with time zone default timezone('utc'::text, now()) not null,
  certificate_id text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.certificates enable row level security;

-- Certificates Policies
create policy "Users can view their own certificates" on public.certificates
  for select using (auth.uid() = user_id);

create policy "Allow admins to write certificates" on public.certificates
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- =========================================================================
-- 5. JOBS TABLE
-- =========================================================================
create table public.jobs (
  id text default gen_random_uuid()::text primary key, -- Use text to maintain job_1 compatibility
  title text not null,
  company text not null,
  loc text not null,
  type text not null default 'Full-time',
  salary text not null,
  match integer not null default 0 check (match >= 0 and match <= 100),
  description text not null default '',
  requirements text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.jobs enable row level security;

-- Jobs Policies
create policy "Allow public read access to jobs" on public.jobs
  for select using (true);

create policy "Allow admins to write jobs" on public.jobs
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- =========================================================================
-- 6. RECOMMENDATIONS TABLE
-- =========================================================================
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_type text not null check (item_type in ('course', 'job')),
  title text not null,
  reason text not null,
  score integer not null default 0 check (score >= 0 and score <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.recommendations enable row level security;

-- Recommendations Policies
create policy "Users can view their own recommendations" on public.recommendations
  for select using (auth.uid() = user_id);


-- =========================================================================
-- 7. NOTIFICATIONS TABLE
-- =========================================================================
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  type text not null default 'info',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Notifications Policies
create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update their own notifications" on public.notifications
  for update using (auth.uid() = user_id);


-- =========================================================================
-- 8. SUBSCRIPTIONS TABLE
-- =========================================================================
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  plan text not null default 'Free' check (plan in ('Free', 'Pro', 'Enterprise')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Subscriptions Policies
create policy "Users can view their own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can upsert their own subscription" on public.subscriptions
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 9. ASSESSMENTS TABLE
-- =========================================================================
create table public.assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  score integer not null check (score >= 0 and score <= 100),
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.assessments enable row level security;

-- Assessments Policies
create policy "Users can view their own assessments" on public.assessments
  for select using (auth.uid() = user_id);

create policy "Users can insert their own assessments" on public.assessments
  for insert with check (auth.uid() = user_id);


-- =========================================================================
-- 10. RESUMES TABLE
-- =========================================================================
create table public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  file_name text not null,
  file_url text not null,
  ats_score integer not null check (ats_score >= 0 and ats_score <= 100),
  skills text[] default '{}'::text[],
  education text default '',
  certifications text[] default '{}'::text[],
  improvements text[] default '{}'::text[],
  parsed_text text default '',
  upload_date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.resumes enable row level security;

-- Resumes Policies
create policy "Users can view their own resume" on public.resumes
  for select using (auth.uid() = user_id);

create policy "Users can insert/update their own resume" on public.resumes
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 11. ATS REPORTS TABLE
-- =========================================================================
create table public.ats_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null check (score >= 0 and score <= 100),
  strengths text[] default '{}'::text[],
  weaknesses text[] default '{}'::text[],
  recommendations text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.ats_reports enable row level security;

-- ATS Reports Policies
create policy "Users can view their own ATS reports" on public.ats_reports
  for select using (auth.uid() = user_id);

create policy "Users can write their own ATS reports" on public.ats_reports
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- 12. CAREER RECOMMENDATIONS TABLE
-- =========================================================================
create table public.career_recommendations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null,
  match_percentage integer not null check (match_percentage >= 0 and match_percentage <= 100),
  reason text not null,
  salary_range text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.career_recommendations enable row level security;

-- Career Recommendations Policies
create policy "Users can view their own career recommendations" on public.career_recommendations
  for select using (auth.uid() = user_id);

create policy "Users can write their own career recommendations" on public.career_recommendations
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- 13. LEARNING ROADMAPS TABLE
-- =========================================================================
create table public.learning_roadmaps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  goal text not null,
  nodes jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.learning_roadmaps enable row level security;

-- Learning Roadmaps Policies
create policy "Users can view their own learning roadmaps" on public.learning_roadmaps
  for select using (auth.uid() = user_id);

create policy "Users can write their own learning roadmaps" on public.learning_roadmaps
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 14. CHAT HISTORY TABLE
-- =========================================================================
create table public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  reply text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chat_history enable row level security;

-- Chat History Policies
create policy "Users can view their own chat history" on public.chat_history
  for select using (auth.uid() = user_id);

create policy "Users can write their own chat history" on public.chat_history
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- 15. USER ACTIVITY LOG TABLE
-- =========================================================================
create table public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_activity enable row level security;

-- User Activity Policies
create policy "Users can view their own activity logs" on public.user_activity
  for select using (auth.uid() = user_id);

create policy "Users can insert their own activity logs" on public.user_activity
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- 16. AI INSIGHTS CACHE TABLE
-- =========================================================================
create table public.ai_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  insight text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.ai_insights enable row level security;

-- AI Insights Policies
create policy "Users can view their own AI insights" on public.ai_insights
  for select using (auth.uid() = user_id);

-- =========================================================================
-- 17. MARKET INSIGHTS TABLE
-- =========================================================================
create table public.market_insights (
  id uuid default gen_random_uuid() primary key,
  category text not null unique,
  growth_rate numeric not null,
  average_salary numeric not null,
  openings_count integer not null,
  market_drivers text[] default '{}'::text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.market_insights enable row level security;

-- Market Insights Policies
create policy "Allow public read access to market insights" on public.market_insights
  for select using (true);

-- =========================================================================
-- 18. CERTIFICATIONS TABLE
-- =========================================================================
create table public.certifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  issuer text not null,
  issue_date date,
  credential_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.certifications enable row level security;

-- Certifications Policies
create policy "Users can view their own certifications" on public.certifications
  for select using (auth.uid() = user_id);

create policy "Users can manage their own certifications" on public.certifications
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 19. PROJECTS TABLE
-- =========================================================================
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  technologies text[] default '{}'::text[],
  project_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;

-- Projects Policies
create policy "Users can view their own projects" on public.projects
  for select using (auth.uid() = user_id);

create policy "Users can manage their own projects" on public.projects
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 20. ACADEMIC DETAILS TABLE
-- =========================================================================
create table public.academic_details (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  degree text not null,
  department text,
  college text not null,
  grad_year integer,
  cgpa numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.academic_details enable row level security;

create policy "Users can view their own academic details" on public.academic_details
  for select using (auth.uid() = user_id);

create policy "Users can manage their own academic details" on public.academic_details
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 21. CAREER DNA TABLE
-- =========================================================================
create table public.career_dna (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  archetype text not null,
  tagline text not null,
  dimensions jsonb not null default '[]'::jsonb,
  strengths text[] default '{}'::text[],
  weaknesses text[] default '{}'::text[],
  recommended_environments text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.career_dna enable row level security;

create policy "Users can view their own career DNA" on public.career_dna
  for select using (auth.uid() = user_id);

create policy "Users can manage their own career DNA" on public.career_dna
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 22. EMPLOYABILITY SCORES TABLE
-- =========================================================================
create table public.employability_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  components jsonb not null default '[]'::jsonb,
  feedback text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.employability_scores enable row level security;

create policy "Users can view their own employability score" on public.employability_scores
  for select using (auth.uid() = user_id);

create policy "Users can manage their own employability score" on public.employability_scores
  for all using (auth.uid() = user_id);

-- =========================================================================
-- 23. USER COURSES TABLE
-- =========================================================================
create table public.user_courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id text references public.courses(id) on delete cascade not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  completed_lessons integer not null default 0,
  total_lessons integer not null default 12,
  last_accessed timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

alter table public.user_courses enable row level security;

create policy "Users can view their own enrolled courses" on public.user_courses
  for select using (auth.uid() = user_id);

create policy "Users can manage their own enrolled courses" on public.user_courses
  for all using (auth.uid() = user_id);
