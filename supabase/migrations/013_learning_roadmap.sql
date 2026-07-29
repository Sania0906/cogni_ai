-- Migration for Personalized Learning Roadmap

CREATE TABLE IF NOT EXISTS public.learning_roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    target_company VARCHAR NOT NULL,
    target_role VARCHAR NOT NULL,
    overall_progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roadmap_id UUID REFERENCES public.learning_roadmaps(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    technologies JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    practice_projects JSONB DEFAULT '[]'::jsonb,
    status VARCHAR DEFAULT 'pending', -- pending, in_progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Setup RLS
ALTER TABLE public.learning_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning roadmaps"
    ON public.learning_roadmaps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning roadmaps"
    ON public.learning_roadmaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning roadmaps"
    ON public.learning_roadmaps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own roadmap milestones"
    ON public.roadmap_milestones FOR SELECT
    USING (roadmap_id IN (SELECT id FROM public.learning_roadmaps WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own roadmap milestones"
    ON public.roadmap_milestones FOR INSERT
    WITH CHECK (roadmap_id IN (SELECT id FROM public.learning_roadmaps WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own roadmap milestones"
    ON public.roadmap_milestones FOR UPDATE
    USING (roadmap_id IN (SELECT id FROM public.learning_roadmaps WHERE user_id = auth.uid()));
