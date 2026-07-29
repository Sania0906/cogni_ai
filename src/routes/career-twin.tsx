import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Activity, Brain, Target, Shield, Zap, MessageSquare, Briefcase, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/career-twin")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "AI Career Twin — CognifyAI" }] }),
  component: CareerTwin,
});

function ProgressBar({ label, score, icon: Icon, colorClass }: { label: string, score: number, icon: any, colorClass: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass}`} /> {label}
        </span>
        <span className="text-sm font-black">{score}/100</span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function CareerTwin() {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    // Fetch latest twin on load
    api.getLatestCareerTwin().then(res => {
      if (res && res.personality) {
        setReport(res);
      }
    }).catch(() => {
      // Ignore if no twin exists
    });
  }, []);

  const handleGenerate = async () => {
    setAnalyzing(true);
    try {
      await new Promise(r => setTimeout(r, 1500)); // UX delay
      const result = await api.generateCareerTwin();
      setReport(result);
      toast.success("Career Twin generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate Career Twin. Please ensure you have uploaded a resume.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            AI Career Twin
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            A dynamic digital representation of your professional identity. Extracted entirely from your latest resume structure, linguistics, and experience map.
          </p>
        </div>
        {!analyzing && (
          <button
            onClick={handleGenerate}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-glow"
          >
            <Sparkles className="h-4 w-4" /> Recalculate Twin
          </button>
        )}
      </header>

      {analyzing ? (
        <div className="h-[500px] flex flex-col items-center justify-center p-8 rounded-3xl bg-card border border-border/10 shadow-card">
          <div className="relative">
            <div className="h-32 w-32 rounded-full border-4 border-muted border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-8 text-xl font-bold animate-pulse text-center">
            Synthesizing your digital twin identity...
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Parsing technical stacks, inferring soft skills from semantics, and mapping maturity.
          </p>
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Identity Card */}
          <div className="col-span-1 lg:col-span-3">
            <div className="p-8 rounded-3xl bg-gradient-primary text-white shadow-glow relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <User className="h-64 w-64" />
              </div>
              
              <div className="h-32 w-32 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center shrink-0 backdrop-blur-md">
                <Brain className="h-16 w-16 text-white" />
              </div>
              
              <div className="flex-1 relative z-10 text-center md:text-left">
                <h3 className="text-sm font-extrabold tracking-widest uppercase text-white/80 mb-1">Career Personality</h3>
                <h2 className="text-4xl font-black mb-3">{report.personality}</h2>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-sm font-bold backdrop-blur-sm mb-4">
                  <Briefcase className="h-4 w-4" /> Maturity Level: {report.maturity_level}
                </div>
                <p className="text-white/90 max-w-2xl text-sm leading-relaxed">
                  Your twin reflects a profile weighted strongly toward your parsed experience. Your predicted pathways highlight alignment with {report.predicted_paths?.[0]} and similar roles.
                </p>
              </div>
            </div>
          </div>

          {/* Scores Column */}
          <div className="col-span-1">
            <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card h-full">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Core Dimensions
              </h3>
              
              <ProgressBar label="Technical Prowess" score={report.technical_score} icon={Zap} colorClass="text-primary" />
              <ProgressBar label="Soft Skills" score={report.soft_skills_score} icon={MessageSquare} colorClass="text-pink" />
              <ProgressBar label="Leadership Potential" score={report.leadership_potential} icon={Shield} colorClass="text-warning" />
              <ProgressBar label="Communication" score={report.communication_score} icon={MessageSquare} colorClass="text-success" />
              <ProgressBar label="Problem Solving" score={report.problem_solving_score} icon={Target} colorClass="text-primary" />
              <ProgressBar label="Learning Agility" score={report.learning_ability} icon={Brain} colorClass="text-pink" />
            </div>
          </div>

          {/* Strengths & Weaknesses Column */}
          <div className="col-span-1 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-success">
                <TrendingUp className="h-5 w-5" /> Top Strengths
              </h3>
              <ul className="space-y-3">
                {report.top_strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="h-5 w-5 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i+1}</span>
                    <span className="font-medium text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Areas to Improve
              </h3>
              <ul className="space-y-3">
                {report.improvement_areas?.map((s: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i+1}</span>
                    <span className="font-medium text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Growth & Predictions Column */}
          <div className="col-span-1 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card bg-primary/5 border-primary/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" /> Predicted Paths
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.predicted_paths?.map((path: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-background border border-border/50 text-sm font-bold shadow-sm">
                    {path}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-warning" /> Growth Roadmap
              </h3>
              <div className="space-y-4">
                {report.growth_suggestions?.map((s: string, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border/30 text-sm leading-relaxed">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="h-[400px] flex flex-col items-center justify-center p-8 rounded-3xl bg-card border border-dashed border-border/40 text-center">
          <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Twin Generated Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
            Generate your AI Career Twin to unlock personalized insights and roadmap predictions based on your latest resume upload.
          </p>
          <button
            onClick={handleGenerate}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-glow"
          >
            <Sparkles className="h-5 w-5" /> Generate Twin Now
          </button>
        </div>
      )}
    </AppShell>
  );
}
