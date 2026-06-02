import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, Clock, Calendar, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/skill-growth")({
  head: () => ({ meta: [{ title: "Skill Growth Prediction — CognifyAI" }] }),
  component: SkillGrowth,
});

interface ChartPoint {
  month: string;
  score: number;
}

function SkillGrowth() {
  const [fastTrack, setFastTrack] = useState(false);
  const [data, setData] = useState<{
    historical: ChartPoint[];
    predicted: ChartPoint[];
    acceleratedStudyPrediction: ChartPoint[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSkillGrowth()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to load skill growth forecast.");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Skill Growth Engine" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your Skill Growth Engine!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Skill Growth Engine" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const prediction = fastTrack ? data.acceleratedStudyPrediction : data.predicted;

  return (
    <AppShell>
      <PageHeader title="Skill Growth Engine" back="/career" />

      {/* Main card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-white/80">Growth Projection</p>
            <h2 className="text-2xl font-bold mt-1">94% Mastery Goal</h2>
            <p className="text-sm text-white/95 mt-1">On track to achieve Senior standard by Dec</p>
          </div>
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Chart container */}
      <div className="p-5 rounded-2xl bg-card shadow-card mb-6">
        <div className="flex justify-between items-center mb-6">
          <p className="font-bold text-sm">Skills Mastery Progress</p>
          {/* Toggle standard vs fast-track */}
          <button 
            onClick={() => setFastTrack(!fastTrack)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              fastTrack ? "bg-gradient-pink text-white shadow-glow" : "bg-muted text-muted-foreground"
            }`}
          >
            <Zap className="h-3 w-3 shrink-0" /> Fast-Track (2hr/day)
          </button>
        </div>

        {/* Visual Line Chart (SVG representation) */}
        <div className="relative w-full h-44 mt-2 flex flex-col justify-end">
          <svg className="w-full h-32 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="10" x2="100" y2="10" stroke="oklch(0.92 0.01 280)" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="20" x2="100" y2="20" stroke="oklch(0.92 0.01 280)" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="30" x2="100" y2="30" stroke="oklch(0.92 0.01 280)" strokeWidth="0.5" strokeDasharray="2,2" />

            {/* Historical Path */}
            <path
              d="M 5,22 L 18,20 L 31,18 L 44,16 L 57,14.4"
              fill="none"
              stroke="oklch(0.55 0.24 280)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Historical circles */}
            <circle cx="5" cy="22" r="1.5" fill="oklch(0.55 0.24 280)" />
            <circle cx="18" cy="20" r="1.5" fill="oklch(0.55 0.24 280)" />
            <circle cx="31" cy="18" r="1.5" fill="oklch(0.55 0.24 280)" />
            <circle cx="44" cy="16" r="1.5" fill="oklch(0.55 0.24 280)" />
            <circle cx="57" cy="14.4" r="1.5" fill="oklch(0.55 0.24 280)" />

            {/* Predicted Path */}
            <path
              d={fastTrack 
                ? "M 57,14.4 L 70,12 L 83,10 L 95,8"
                : "M 57,14.4 L 70,13 L 83,11.5 L 95,9"
              }
              fill="none"
              stroke={fastTrack ? "oklch(0.65 0.24 350)" : "oklch(0.55 0.24 280)"}
              strokeWidth="2"
              strokeDasharray="2,2"
              strokeLinecap="round"
            />
            {/* Predicted circles */}
            <circle cx="70" cy={fastTrack ? 12 : 13} r="1.5" fill={fastTrack ? "oklch(0.65 0.24 350)" : "oklch(0.55 0.24 280)"} />
            <circle cx="83" cy={fastTrack ? 10 : 11.5} r="1.5" fill={fastTrack ? "oklch(0.65 0.24 350)" : "oklch(0.55 0.24 280)"} />
            <circle cx="95" cy={fastTrack ? 8 : 9} r="1.5" fill={fastTrack ? "oklch(0.65 0.24 350)" : "oklch(0.55 0.24 280)"} />
          </svg>

          {/* Month Labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-4 px-2">
            <span>Jan (45%)</span>
            <span>Mar (53%)</span>
            <span>May (64%)</span>
            <span>Aug ({fastTrack ? "83%" : "76%"})</span>
            <span>Dec ({fastTrack ? "99%" : "94%"})</span>
          </div>
        </div>
      </div>

      {/* Details / Legend */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-card shadow-card">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" /> Study Pace
          </p>
          <p className="text-lg font-bold mt-1.5">{fastTrack ? "12-15 hours" : "5-6 hours"}</p>
          <p className="text-[10px] text-muted-foreground">per week</p>
        </div>
        <div className="p-4 rounded-2xl bg-card shadow-card">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" /> Target Accomplished
          </p>
          <p className="text-lg font-bold mt-1.5">{fastTrack ? "3.5 months" : "7.2 months"}</p>
          <p className="text-[10px] text-muted-foreground">estimated time</p>
        </div>
      </div>
    </AppShell>
  );
}
