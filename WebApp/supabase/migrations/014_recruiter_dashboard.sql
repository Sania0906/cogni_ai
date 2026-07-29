-- Migration for Recruiter Dashboard

CREATE TABLE IF NOT EXISTS public.recruiter_shortlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(recruiter_id, candidate_id)
);

-- Setup RLS
ALTER TABLE public.recruiter_shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shortlists"
    ON public.recruiter_shortlists FOR SELECT
    USING (auth.uid() = recruiter_id);

CREATE POLICY "Users can insert own shortlists"
    ON public.recruiter_shortlists FOR INSERT
    WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Users can delete own shortlists"
    ON public.recruiter_shortlists FOR DELETE
    USING (auth.uid() = recruiter_id);
