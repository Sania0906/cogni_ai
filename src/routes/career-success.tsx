import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Award, ShieldCheck, Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/career-success")({
  head: () => ({ meta: [{ title: "Career Success Probability — CognifyAI" }] }),
  component: CareerSuccess,
});

interface SuccessData {
  targetRole: string;
  probabilityScore: number;
  breakdown: { name: string; rating: number; detail: string }[];
  growthOutlook: string;
  alternativeRoles: { role: string; prob: number }[];
}

function CareerSuccess() {
  const [data, setData] = useState<SuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCareerSuccess()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to retrieve Career Success Probability");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Success Probability" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your Career Success Probability!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Success Probability" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  // SVG parameters for circle
  const size = 150;
  const radius = 60;
  const strokeWidth = 12;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (data.probabilityScore / 100) * circumference;

  return (
    <AppShell>
      <PageHeader title="Success Probability" back="/career" />

      {/* Main Probability Visualizer */}
      <div className="p-6 rounded-3xl bg-card shadow-card flex flex-col items-center mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-4">Probability of Success in Role</p>
        <div className="relative mb-4 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="oklch(0.92 0.01 280)"
              strokeWidth={strokeWidth}
            />
            {/* Foreground Circle */}
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
            <span className="text-4xl font-extrabold text-foreground">{data.probabilityScore}%</span>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fit Rating</p>
          </div>
        </div>
        <p className="font-bold text-center text-lg">{data.targetRole}</p>
        <p className="text-xs text-success font-semibold mt-1">Growth Outlook: {data.growthOutlook}</p>
      </div>

      {/* Breakdown List */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><ShieldCheck className="h-5 w-5 text-primary" /> Core Factor Evaluation</h3>
      <div className="space-y-3 mb-6">
        {data.breakdown.map((b) => (
          <div key={b.name} className="p-4 rounded-2xl bg-card shadow-card border border-border/30">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">{b.name}</span>
              <span className="text-xs font-extrabold text-primary">{b.rating}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${b.rating}%` }} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{b.detail}</p>
          </div>
        ))}
      </div>

      {/* Alternative Paths */}
      <div className="p-5 rounded-2xl bg-card shadow-card">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" /> Alternate High-Fit Roles
        </h3>
        <div className="space-y-3">
          {data.alternativeRoles.map((alt) => (
            <div key={alt.role} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="h-10 w-10 rounded-lg bg-gradient-pink text-white flex items-center justify-center font-bold text-xs shrink-0">
                {alt.prob}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{alt.role}</p>
                <p className="text-xs text-muted-foreground">High synergy with current skill set</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
