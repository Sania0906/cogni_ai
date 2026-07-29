import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Compass,
  CheckCircle2,
  Circle,
  Sparkles,
  Building,
  Briefcase,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/roadmap-generator")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "AI Learning Roadmap — CognifyAI" }] }),
  component: RoadmapGenerator,
});

type RoadmapState = "loading" | "setup" | "generating" | "dashboard";

function RoadmapGenerator() {
  const [state, setState] = useState<RoadmapState>("loading");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [roadmap, setRoadmap] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    fetchLatestRoadmap();
  }, []);

  const fetchLatestRoadmap = async () => {
    try {
      const data = await api.getLatestRoadmap();
      if (data && data.roadmap) {
        setRoadmap(data.roadmap);
        setMilestones(data.milestones || []);
        setState("dashboard");
      } else {
        setState("setup");
      }
    } catch (err) {
      toast.error("Failed to load learning roadmap.");
      setState("setup");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) {
      toast.error("Please enter a target company and role.");
      return;
    }

    setState("generating");
    try {
      const data = await api.generateRoadmap({ company, role });
      setRoadmap(data.roadmap);
      setMilestones(data.milestones || []);
      setState("dashboard");
      toast.success("Personalized Roadmap generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate roadmap.");
      setState("setup");
    }
  };

  const handleToggleStatus = async (
    milestoneId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    // Optimistic UI update
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, status: newStatus } : m)),
    );

    try {
      await api.updateMilestoneStatus(milestoneId, newStatus, roadmap.id);
      fetchLatestRoadmap(); // Refresh progress in background
    } catch (err) {
      toast.error("Failed to update milestone status.");
      fetchLatestRoadmap(); // Revert
    }
  };

  return (
    <AppShell>
      <PageHeader title="AI Learning Roadmap" back="/career" />

      {state === "loading" && (
        <div className="flex justify-center py-20 animate-in fade-in">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {state === "generating" && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-muted-foreground">
            Mapping your personalized journey...
          </p>
        </div>
      )}

      {state === "setup" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <h2 className="text-2xl font-bold mb-2">Build Your Roadmap</h2>
            <p className="text-sm text-white/80">
              We'll analyze your latest resume, identify missing skills, and
              generate a week-by-week curriculum to get you hired.
            </p>
          </div>

          <form
            onSubmit={handleGenerate}
            className="bg-card shadow-card p-5 rounded-3xl space-y-4 border border-border/10"
          >
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
              Generate Roadmap
            </button>
          </form>
        </div>
      )}

      {state === "dashboard" && roadmap && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow relative overflow-hidden flex flex-col">
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="flex justify-between items-start mb-4 z-10">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy className="h-4.5 w-4.5 text-pink-300" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-white/80">
                    Target Milestone
                  </span>
                </div>
                <h2 className="text-2xl font-bold">
                  {roadmap.target_role} @ {roadmap.target_company}
                </h2>
              </div>
              <button
                onClick={() => setState("setup")}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition border-0 cursor-pointer text-white"
                title="Generate New Roadmap"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 z-10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white/90">
                  Overall Progress
                </span>
                <span className="text-sm font-extrabold">
                  {roadmap.overall_progress}%
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${roadmap.overall_progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="relative pl-8 border-l-2 border-border/80 ml-4 space-y-8 mb-6">
            {milestones.map((node, idx) => {
              const isCompleted = node.status === "completed";

              return (
                <div key={node.id} className="relative">
                  <button
                    onClick={() => handleToggleStatus(node.id, node.status)}
                    className="absolute -left-[45px] top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border cursor-pointer hover:scale-110 transition-transform z-10 p-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-success fill-success/10 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <div
                    className={`p-5 rounded-2xl shadow-card border transition-colors ${isCompleted ? "bg-success/5 border-success/30" : "bg-card border-border/20"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Week {node.week_number}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] font-bold text-success uppercase bg-success/10 px-2 py-0.5 rounded-md">
                          Completed
                        </span>
                      )}
                    </div>
                    <h4
                      className={`font-bold text-base leading-tight mb-2 ${isCompleted ? "line-through text-muted-foreground" : "text-card-foreground"}`}
                    >
                      {node.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {node.description}
                    </p>

                    <div className="space-y-3">
                      {node.technologies && node.technologies.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            Technologies
                          </span>
                          <div className="flex gap-1.5 flex-wrap">
                            {node.technologies.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {node.practice_projects &&
                        node.practice_projects.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                              Practice Projects
                            </span>
                            <div className="flex flex-col gap-1">
                              {node.practice_projects.map((p: string) => (
                                <span
                                  key={p}
                                  className="text-xs font-semibold text-card-foreground flex items-center gap-1.5 before:content-[''] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {node.certifications &&
                        node.certifications.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                              Certifications
                            </span>
                            <div className="flex flex-col gap-1">
                              {node.certifications.map((c: string) => (
                                <span
                                  key={c}
                                  className="text-xs font-semibold text-pink-500 flex items-center gap-1.5"
                                >
                                  🏆 {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
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
