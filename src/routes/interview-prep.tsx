import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import {
  MessageSquare,
  Code,
  Users,
  BookOpen,
  Sparkles,
  Building,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/interview-prep")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "AI Interview Simulator — CognifyAI" }] }),
  component: InterviewSimulator,
});

type InterviewState =
  | "setup"
  | "generating"
  | "active"
  | "evaluating"
  | "results";

function InterviewSimulator() {
  const [state, setState] = useState<InterviewState>("setup");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [results, setResults] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) {
      toast.error("Please enter a company and role.");
      return;
    }

    setState("generating");
    try {
      const res = await api.generateInterview({ company, role });
      setSessionId(res.session_id);
      setQuestions(res.questions);
      setCurrentQIndex(0);
      setAnswers({});
      setState("active");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate interview.");
      setState("setup");
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleSubmitInterview = async () => {
    setState("evaluating");

    // Format answers array
    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] || "",
    }));

    try {
      const res = await api.evaluateInterview({
        sessionId,
        answers: formattedAnswers,
      });
      setResults(res);
      setState("results");
      toast.success("Interview evaluated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to evaluate interview.");
      setState("active");
    }
  };

  return (
    <AppShell>
      <PageHeader title="AI Interview Simulator" back="/career" />

      {state === "setup" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
            <h2 className="text-2xl font-bold mb-2">Dynamic Interview Prep</h2>
            <p className="text-sm text-white/80">
              We generate tailored interview questions by cross-analyzing your
              uploaded resume against the target company and role.
            </p>
          </div>

          <form
            onSubmit={handleGenerate}
            className="bg-card shadow-card p-5 rounded-3xl space-y-4 border border-border/10"
          >
            <h3 className="text-lg font-bold text-card-foreground">
              Configure Simulation
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" /> Target Company
              </label>
              <input
                type="text"
                placeholder="e.g. Google, Meta, Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-muted/40 border border-border/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-card-foreground font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Target Role
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-muted/40 border border-border/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-card-foreground font-medium"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Generate Interview
            </button>
          </form>
        </div>
      )}

      {state === "generating" && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-muted-foreground">
            Synthesizing context-aware questions...
          </p>
        </div>
      )}

      {state === "evaluating" && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-muted-foreground">
            AI is evaluating your answers...
          </p>
        </div>
      )}

      {state === "active" && questions.length > 0 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
              {questions[currentQIndex].question_type}
            </span>
          </div>

          <div className="bg-card shadow-card p-5 rounded-3xl border border-border/10">
            <h2 className="text-lg font-bold text-card-foreground mb-4 leading-snug">
              {questions[currentQIndex].question_text}
            </h2>

            <textarea
              placeholder="Type your answer here using the STAR method..."
              value={answers[questions[currentQIndex].id] || ""}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [questions[currentQIndex].id]: e.target.value,
                })
              }
              className="w-full h-48 bg-muted/40 border border-border/50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-card-foreground resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQIndex === 0}
              className="px-5 py-3 rounded-xl font-bold text-sm bg-muted/60 text-card-foreground disabled:opacity-50 transition"
            >
              Previous
            </button>

            {currentQIndex < questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-primary text-white shadow-glow flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Next Question <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitInterview}
                className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-success text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Submit Interview <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {state === "results" && results && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-3xl p-6 bg-card border border-border/10 shadow-card text-center">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Interview Results
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-primary text-white shadow-glow">
                <p className="text-xs opacity-80 font-semibold mb-1">
                  Quality Score
                </p>
                <p className="text-3xl font-extrabold">
                  {results.overall_quality_score}%
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-pink text-white shadow-glow">
                <p className="text-xs opacity-80 font-semibold mb-1">
                  Confidence Score
                </p>
                <p className="text-3xl font-extrabold">
                  {results.overall_confidence_score}%
                </p>
              </div>
            </div>
            <button
              onClick={() => setState("setup")}
              className="mt-5 w-full py-3 rounded-xl bg-muted/60 text-card-foreground font-bold text-sm hover:bg-muted/80 transition"
            >
              Start New Simulation
            </button>
          </div>

          <h3 className="text-lg font-bold">Detailed Feedback</h3>
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const evalData = results.evaluations.find(
                (e: any) => e.question_id === q.id,
              );
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-3xl bg-card border border-border/10 shadow-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                      Q{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                      {q.question_type}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-card-foreground mb-3">
                    {q.question_text}
                  </p>

                  <div className="bg-muted/30 p-3 rounded-xl mb-4 border border-border/40">
                    <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                      Your Answer
                    </p>
                    <p className="text-sm font-medium text-card-foreground/80 italic">
                      "{answers[q.id] || "No answer provided."}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Quality
                      </span>
                      <span
                        className={`text-xs font-extrabold ${evalData?.quality_score >= 70 ? "text-success" : "text-destructive"}`}
                      >
                        {evalData?.quality_score}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Confidence
                      </span>
                      <span
                        className={`text-xs font-extrabold ${evalData?.confidence_score >= 70 ? "text-success" : "text-destructive"}`}
                      >
                        {evalData?.confidence_score}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[11px] font-bold text-primary mb-1 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Suggestion
                    </p>
                    <p className="text-sm font-medium text-card-foreground">
                      {evalData?.improvement_suggestion}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
