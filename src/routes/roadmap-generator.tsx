import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Compass, CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/roadmap-generator")({
  head: () => ({ meta: [{ title: "AI Learning Roadmap — CognifyAI" }] }),
  component: RoadmapGenerator,
});

interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: string;
  skills: string[];
  courses: { name: string; path: string }[];
}

function RoadmapGenerator() {
  const [data, setData] = useState<{ goal: string; nodes: RoadmapNode[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getRoadmap()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to load learning roadmap.");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="AI Learning Roadmap" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your custom AI Learning Roadmap!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="AI Learning Roadmap" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="AI Learning Roadmap" back="/career" />

      {/* Target Goal Header */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-4.5 w-4.5 text-pink-300" />
          <span className="text-xs uppercase tracking-wider font-semibold text-white/80">AI Generated Pathway</span>
        </div>
        <p className="text-xs text-white/80">Target Milestone</p>
        <h2 className="text-2xl font-bold">{data.goal}</h2>
      </div>

      {/* Roadmap Tree Visualizer */}
      <div className="relative pl-8 border-l-2 border-border/80 ml-4 space-y-8 mb-6">
        {data.nodes.map((node, idx) => {
          const isCompleted = node.status === "completed";
          const isInProgress = node.status === "in-progress";
          
          return (
            <div key={node.id} className="relative">
              {/* Status Circle Pin */}
              <span className="absolute -left-12 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-success fill-success/10 shrink-0" />
                ) : isInProgress ? (
                  <span className="h-3.5 w-3.5 rounded-full bg-primary animate-pulse shrink-0" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                )}
              </span>

              {/* Node Card */}
              <div className={`p-5 rounded-2xl bg-card shadow-card border ${isInProgress ? "border-primary/30" : "border-border/20"}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">STEP {idx + 1}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {node.duration}
                  </span>
                </div>
                <h4 className="font-bold text-sm leading-tight mb-2">{node.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{node.description}</p>

                {/* Skills tags */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {node.skills.map((s) => (
                    <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Recommended courses */}
                {node.courses.map((course) => (
                  <Link 
                    key={course.name}
                    to={course.path}
                    className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-1"
                  >
                    <Compass className="h-3.5 w-3.5" /> Study: {course.name} →
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
