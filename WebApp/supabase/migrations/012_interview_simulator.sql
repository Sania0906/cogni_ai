-- Migration for AI Interview Simulator

CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    overall_quality_score INTEGER,
    overall_confidence_score INTEGER,
    status VARCHAR DEFAULT 'in_progress', -- in_progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    question_type VARCHAR NOT NULL, -- Technical, HR, Behavioral, Coding, Project-based
    question_text TEXT NOT NULL,
    user_answer TEXT,
    quality_score INTEGER,
    confidence_score INTEGER,
    improvement_suggestion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Setup RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interview sessions"
    ON public.interview_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview sessions"
    ON public.interview_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview sessions"
    ON public.interview_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own interview questions"
    ON public.interview_questions FOR SELECT
    USING (session_id IN (SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own interview questions"
    ON public.interview_questions FOR INSERT
    WITH CHECK (session_id IN (SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own interview questions"
    ON public.interview_questions FOR UPDATE
    USING (session_id IN (SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()));
