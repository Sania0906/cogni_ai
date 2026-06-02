import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Flame, Compass, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/skill-gap")({
  head: () => ({ meta: [{ title: "Skill Gap Heatmap — CognifyAI" }] }),
  component: SkillGap,
});

interface GapItem {
  name: string;
  current: number;
  required: number;
  gap: number;
  status: string;
}

function SkillGap() {
  const [data, setData] = useState<{
    targetRole: string;
    matchPercentage: number;
    skills: GapItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSkillGap()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to load skill gap analysis.");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Skill Gap Heatmap" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your Skill Gap Heatmap!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Skill Gap Heatmap" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const getHeatStyles = (gap: number) => {
    if (gap >= 0) return "bg-success/20 text-success border-success/30";
    if (gap > -20) return "bg-warning/20 text-warning border-warning/30";
    return "bg-destructive/15 text-destructive border-destructive/30 animate-pulse";
  };

  return (
    <AppShell>
      <PageHeader title="Skill Gap Heatmap" back="/career" />

      {/* Overview Card */}
      <div className="rounded-3xl p-5 bg-gradient-pink text-white shadow-glow mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-white/80">Target Role Analysis</p>
          <h2 className="text-xl font-bold mt-1">{data.targetRole}</h2>
          <p className="text-sm text-white/90 mt-1">{data.matchPercentage}% Overall compatibility score</p>
        </div>
        <Flame className="h-8 w-8 text-white animate-bounce" />
      </div>

      {/* Heatmap Grid */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><Target className="h-5 w-5 text-primary" /> Skill Match Details</h3>
      <div className="space-y-3 mb-6">
        {data.skills.map((item) => (
          <div key={item.name} className="p-4 rounded-2xl bg-card shadow-card border border-border/40">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">{item.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getHeatStyles(item.gap)}`}>
                {item.status}
              </span>
            </div>
            
            {/* Bars for comparison */}
            <div className="space-y-1.5">
              <div className="flex items-center text-xs justify-between">
                <span className="text-muted-foreground">Current: {item.current}%</span>
                <span className="text-muted-foreground">Target: {item.required}%</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden relative">
                {/* Required bar */}
                <div 
                  className="absolute top-0 bottom-0 bg-primary/20 border-r-2 border-primary/50" 
                  style={{ width: `${item.required}%` }}
                />
                {/* Current bar */}
                <div 
                  className={`h-full rounded-full ${item.gap >= 0 ? "bg-success" : item.gap > -20 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${item.current}%` }}
                />
              </div>
              {item.gap < 0 && (
                <p className="text-[10px] text-destructive/90 font-medium">
                  Missing {Math.abs(item.gap)}% skill proficiency
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Bridge Action */}
      <div className="p-5 rounded-2xl bg-card shadow-card mb-6">
        <h3 className="font-bold text-base flex items-center gap-2 mb-3">
          <Compass className="h-5 w-5 text-primary" /> Bridge the Gap
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          To reach 90%+ matching for <span className="font-bold text-foreground">{data.targetRole}</span>, prioritize studying courses in your missing components.
        </p>
        <Link 
          to="/courses" 
          className="w-full h-12 rounded-xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-1.5 shadow-glow"
        >
          Explore Bridge Courses
        </Link>
      </div>
    </AppShell>
  );
}
