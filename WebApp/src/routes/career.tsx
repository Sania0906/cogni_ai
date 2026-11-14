import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Briefcase,
  TrendingUp,
  MessageSquare,
  Target,
  Award,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/career")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Career Paths — CognifyAI" }] }),
  component: Career,
});

function Career() {
  const [paths, setPaths] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPaths() {
      try {
        const data = await api.getCareerPaths();
        setPaths(data);
      } catch (err) {
        console.error("Failed to load career paths", err);
      } finally {
        setLoading(false);
      }
    }
    loadPaths();
  }, []);

  const activePath = paths[selectedIdx] || null;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Career Paths</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        AI-predicted career recommendations and skill alignments
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          {/* Horizontal Track Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {paths.map((p, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={p.role}
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-gradient-primary text-white border-transparent shadow-glow"
                      : "bg-card hover:bg-muted/10 border-border/50 text-muted-foreground"
                  }`}
                >
                  {p.role} ({p.matchPercentage}%)
                </button>
              );
            })}
          </div>

          {activePath && (
            <>
              {/* Highlight Card */}
              <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
                <h2 className="text-2xl font-bold">{activePath.role}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <TrendingUp className="h-4 w-4" />{" "}
                    {activePath.matchPercentage}% Match
                  </span>
                  <span>•</span>
                  <span className="font-semibold">AI Recommendation</span>
                </div>
                <p className="text-xs text-white/80 mt-3 leading-relaxed">
                  Calculated based on your interests, academic history,
                  completed assessment scores, and resume parsing analysis.
                </p>
              </div>

              {/* Salary and Timeline Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                    <span className="text-success font-black text-sm">$</span>{" "}
                    Avg Salary
                  </p>
                  <p className="text-base font-black text-card-foreground mt-1.5">
                    {activePath.salaryRange}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    market estimate
                  </p>
                </div>
                <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                    <span className="text-primary text-sm">⏱</span> Timeline
                  </p>
                  <p className="text-base font-black text-card-foreground mt-1.5">
                    {activePath.matchPercentage >= 80
                      ? "Immediate Fit"
                      : activePath.matchPercentage >= 65
                        ? "6-12 Months"
                        : "1-2 Years"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    target role time
                  </p>
                </div>
              </div>

              {/* Skill mapping checklist */}
              <div className="p-5 rounded-3xl bg-card shadow-card border border-border/10 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold mb-2.5">
                    Core Required Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activePath.requiredSkills.map((s: string) => {
                      const isMissing = activePath.missingSkills.includes(s);
                      return (
                        <span
                          key={s}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                            isMissing
                              ? "bg-destructive/5 text-destructive border-destructive/15"
                              : "bg-success/5 text-success border-success/15"
                          }`}
                        >
                          {isMissing ? "✕" : "✓"} {s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {activePath.missingSkills.length > 0 && (
                  <div className="pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-bold mb-2.5">
                      Key Skill Gaps to Close
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePath.missingSkills.map((s: string) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning border border-warning/15 text-xs font-bold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Navigation - Analyze Complete Skill Gap */}
              <Link
                to="/skill-gap"
                className="w-full py-3.5 px-5 rounded-2xl bg-primary text-white font-bold text-sm shadow-glow hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <span>Analyze Complete Skill Gap</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
