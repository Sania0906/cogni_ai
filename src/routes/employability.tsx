import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Trophy, Lightbulb, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/employability")({
  head: () => ({ meta: [{ title: "Employability Score — CognifyAI" }] }),
  component: EmployabilityScore,
});

interface EmployabilityData {
  overallScore: number;
  components: { label: string; score: number; status: string }[];
  feedback: string[];
}

function EmployabilityScore() {
  const [data, setData] = useState<EmployabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEmployability()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to retrieve Employability details");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Employability Score" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your Employability Index score!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Employability Score" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  // SVG parameters for circle
  const size = 160;
  const radius = 64;
  const strokeWidth = 14;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (data.overallScore / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 90) return "bg-success";
    if (score >= 70) return "bg-gradient-blue";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <AppShell>
      <PageHeader title="Employability Score" back="/career" />

      {/* Main Score Radial Display */}
      <div className="p-6 rounded-3xl bg-card shadow-card flex flex-col items-center mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-4">Competitiveness Index</p>
        <div className="relative mb-4 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="oklch(0.92 0.01 280)"
              strokeWidth={strokeWidth}
            />
            {/* Foreground circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="oklch(0.55 0.24 280)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-4xl font-extrabold text-foreground">{data.overallScore}</span>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Index Score</p>
          </div>
        </div>
        <p className="font-bold text-center text-base">Market Readiness Status: Highly Competitive</p>
        <p className="text-xs text-muted-foreground mt-1 text-center">Your profile matches standard candidate benchmarks.</p>
      </div>

      {/* Component breakdown */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><ShieldCheck className="h-5 w-5 text-primary" /> Score Breakdown</h3>
      <div className="space-y-3 mb-6">
        {data.components.map((c) => (
          <div key={c.label} className="p-4 rounded-2xl bg-card shadow-card border border-border/30">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs max-w-[70%]">{c.label}</span>
              <span className="text-xs font-bold text-primary">{c.score}/100</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
              <div className={`h-full ${getColor(c.score)} rounded-full`} style={{ width: `${c.score}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">{c.status}</span>
          </div>
        ))}
      </div>

      {/* Improvement Suggestions */}
      <div className="p-5 rounded-2xl bg-card shadow-card">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-warning animate-pulse" /> Improvement Tips
        </h3>
        <div className="space-y-3">
          {data.feedback.map((tip, idx) => (
            <div key={idx} className="flex gap-2.5 items-start text-xs text-muted-foreground leading-relaxed">
              <Trophy className="h-4.5 w-4.5 text-yellow-500 shrink-0 mt-0.5" />
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
