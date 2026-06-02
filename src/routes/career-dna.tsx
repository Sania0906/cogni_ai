import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/career-dna")({
  head: () => ({ meta: [{ title: "AI Career DNA — CognifyAI" }] }),
  component: CareerDNA,
});

interface DNAShape {
  archetype: string;
  tagline: string;
  dimensions: { subject: string; val: number; angle: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendedEnvironments: string[];
}

function CareerDNA() {
  const [data, setData] = useState<DNAShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCareerDNA()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to retrieve Career DNA details");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="AI Career DNA" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your AI Career DNA archetype!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="AI Career DNA" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  // SVG parameters for the Radar chart
  const width = 420;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const rMax = 75;

  const getCoordinates = (angleDegrees: number, value: number) => {
    const angleRadians = (angleDegrees - 90) * (Math.PI / 180);
    const r = (value / 100) * rMax;
    const x = centerX + r * Math.cos(angleRadians);
    const y = centerY + r * Math.sin(angleRadians);
    return { x, y };
  };

  const points = data.dimensions.map(d => {
    const { x, y } = getCoordinates(d.angle, d.val);
    return `${x},${y}`;
  }).join(" ");

  const gridPoints50 = data.dimensions.map(d => {
    const { x, y } = getCoordinates(d.angle, 50);
    return `${x},${y}`;
  }).join(" ");

  const gridPoints100 = data.dimensions.map(d => {
    const { x, y } = getCoordinates(d.angle, 100);
    return `${x},${y}`;
  }).join(" ");

  return (
    <AppShell>
      <PageHeader title="AI Career DNA" back="/career" />

      {/* Header Archetype Card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-pink-300 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-semibold text-white/80">AI Archetype Analysis</span>
        </div>
        <h2 className="text-2xl font-bold">{data.archetype}</h2>
        <p className="text-sm text-white/95 mt-2 leading-relaxed">
          {data.tagline}
        </p>
      </div>

      {/* Radar Chart Visualizer */}
      <div className="p-6 rounded-2xl bg-card shadow-card mb-6 flex flex-col items-center">
        <p className="font-bold text-center mb-4">Cognitive Fit Mapping</p>
        <div className="relative w-full max-w-[420px] aspect-[7/5] mx-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Outer Grid Ring */}
            <polygon points={gridPoints100} fill="none" stroke="oklch(0.92 0.01 280)" strokeWidth="1" />
            {/* Mid Grid Ring */}
            <polygon points={gridPoints50} fill="none" stroke="oklch(0.92 0.01 280)" strokeWidth="1" strokeDasharray="3,3" />

            {/* Axis Lines */}
            {data.dimensions.map((d, i) => {
              const outerPoint = getCoordinates(d.angle, 100);
              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                  stroke="oklch(0.92 0.01 280)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Radar Polygon Shape */}
            <polygon
              points={points}
              fill="oklch(0.55 0.24 280 / 0.2)"
              stroke="oklch(0.55 0.24 280)"
              strokeWidth="2.5"
            />

            {/* Axis Labels */}
            {data.dimensions.map((d, i) => {
              const labelPos = getCoordinates(d.angle, 118);
              let textAnchor = "middle";
              if (d.angle > 0 && d.angle < 180) textAnchor = "start";
              if (d.angle > 180 && d.angle < 360) textAnchor = "end";

              return (
                <text
                  key={i}
                  x={labelPos.x}
                  y={labelPos.y + 4}
                  textAnchor={textAnchor}
                  className="fill-foreground text-[10px] font-bold tracking-tight"
                >
                  {d.subject}
                </text>
              );
            })}

            {/* Center point */}
            <circle cx={centerX} cy={centerY} r="3" fill="oklch(0.55 0.24 280)" />
          </svg>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="space-y-4 mb-6">
        <div className="p-5 rounded-2xl bg-card shadow-card border border-success/10">
          <h3 className="font-bold flex items-center gap-2 text-success text-base mb-3">
            <CheckCircle2 className="h-5 w-5" /> Key Strengths
          </h3>
          <ul className="space-y-2">
            {data.strengths.map((str, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0 mt-2" />
                {str}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-card shadow-card border border-destructive/10">
          <h3 className="font-bold flex items-center gap-2 text-destructive text-base mb-3">
            <AlertTriangle className="h-5 w-5" /> Cognitive Blindspots
          </h3>
          <ul className="space-y-2">
            {data.weaknesses.map((str, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0 mt-2" />
                {str}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Environments */}
      <div className="p-5 rounded-2xl bg-card shadow-card mb-6">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Recommended Workplaces
        </h3>
        <div className="space-y-2">
          {data.recommendedEnvironments.map((env, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-muted/40 text-sm font-semibold flex items-center gap-2">
              <span className="text-primary font-bold">#</span>
              {env}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
