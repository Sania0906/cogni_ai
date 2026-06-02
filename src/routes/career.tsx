import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, TrendingUp, MessageSquare, Target, Award } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/career")({
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
                    <TrendingUp className="h-4 w-4" /> {activePath.matchPercentage}% Match
                  </span>
                  <span>•</span>
                  <span className="font-semibold">AI Recommendation</span>
                </div>
                <p className="text-xs text-white/80 mt-3 leading-relaxed">
                  Calculated based on your interests, academic history, completed assessment scores, and resume parsing analysis.
                </p>
              </div>

              {/* Salary and Timeline Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                    <span className="text-success font-black text-sm">$</span> Avg Salary
                  </p>
                  <p className="text-base font-black text-card-foreground mt-1.5">{activePath.salaryRange}</p>
                  <p className="text-[10px] text-muted-foreground">market estimate</p>
                </div>
                <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                    <span className="text-primary text-sm">⏱</span> Timeline
                  </p>
                  <p className="text-base font-black text-card-foreground mt-1.5">
                    {activePath.matchPercentage >= 80 ? "Immediate Fit" : activePath.matchPercentage >= 65 ? "6-12 Months" : "1-2 Years"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">target role time</p>
                </div>
              </div>

              {/* Skill mapping checklist */}
              <div className="p-5 rounded-3xl bg-card shadow-card border border-border/10 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold mb-2.5">Core Required Skills</p>
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
                    <p className="text-xs text-muted-foreground font-bold mb-2.5">Key Skill Gaps to Close</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePath.missingSkills.map((s: string) => (
                        <span key={s} className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning border border-warning/15 text-xs font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Course roadmap suggestions */}
              <div className="p-5 rounded-3xl bg-card shadow-card border border-border/10">
                <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-1.5">
                  <Target className="h-4.5 w-4.5 text-primary" /> Recommended Course Roadmap
                </h3>
                <div className="space-y-3.5">
                  {activePath.learningRoadmap.map((course: string, i: number) => (
                    <div key={course} className="flex gap-3 items-start">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-card-foreground">{course}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Accelerated course to build target competencies</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <h3 className="text-lg font-bold mt-4 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/jobs" className="p-5 rounded-2xl bg-card shadow-card flex flex-col items-start gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white">
            <Briefcase className="h-5 w-5" />
          </div>
          <p className="font-bold">Job Search</p>
          <p className="text-xs text-muted-foreground">Find matching roles</p>
        </Link>
        <Link to="/courses" className="p-5 rounded-2xl bg-card shadow-card flex flex-col items-start gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-pink flex items-center justify-center text-white">
            <Target className="h-5 w-5" />
          </div>
          <p className="font-bold">Learning Path</p>
          <p className="text-xs text-muted-foreground">Explore skills</p>
        </Link>
        <Link to="/ai-assistant" className="col-span-2 p-5 rounded-2xl bg-card shadow-card flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-blue flex items-center justify-center text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Interview Prep with AI</p>
            <p className="text-xs text-muted-foreground">Practice real question banks</p>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
