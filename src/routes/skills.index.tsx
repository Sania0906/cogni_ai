import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Code2, Brain, BarChart3, Database, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/skills/")({
  head: () => ({ meta: [{ title: "My Skills — CognifyAI" }] }),
  component: Skills,
});

function Skills() {
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [gapData, setGapData] = useState<any>(null);
  const [overallScore, setOverallScore] = useState(85);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await api.getSkills().catch(() => []);
        const assessmentsData = await api.getAssessments().catch(() => []);
        const gap = await api.getSkillGap().catch(() => null);

        setAssessments(assessmentsData);
        setGapData(gap);

        if (data && data.length > 0) {
          const mapped = data.map((s: any, idx: number) => {
            let icon = Database;
            const nameLower = s.name.toLowerCase();
            const catLower = (s.category || "").toLowerCase();
            if (catLower.includes("prog") || nameLower.includes("python") || nameLower.includes("code") || nameLower.includes("scripting") || nameLower.includes("java")) {
              icon = Code2;
            } else if (catLower.includes("ai") || catLower.includes("ml") || nameLower.includes("machine") || nameLower.includes("deep") || nameLower.includes("intelligence")) {
              icon = Brain;
            } else if (catLower.includes("data") || nameLower.includes("visual") || nameLower.includes("chart")) {
              icon = BarChart3;
            }

            const colors = ["bg-gradient-blue", "bg-gradient-primary", "bg-gradient-pink"];
            const color = colors[idx % colors.length];

            const lvl = typeof s.progress === "number" ? s.progress : (s.level === "Advanced" ? 90 : s.level === "Intermediate" ? 70 : 40);

            return {
              id: s.id,
              name: s.name,
              level: lvl,
              icon,
              color,
              proficiency: s.level || (lvl >= 85 ? "Advanced" : lvl >= 60 ? "Intermediate" : "Beginner")
            };
          });

          setSkillsList(mapped);
          
          let avg = 85;
          const skillSum = mapped.reduce((sum, item) => sum + item.level, 0);
          const assessSum = assessmentsData.reduce((sum, item) => sum + item.score, 0);
          const totalCount = mapped.length + assessmentsData.length;
          
          if (totalCount > 0) {
            avg = Math.round((skillSum + assessSum) / totalCount);
          }
          setOverallScore(avg);
        } else if (assessmentsData && assessmentsData.length > 0) {
          const avg = Math.round(assessmentsData.reduce((sum, item) => sum + item.score, 0) / assessmentsData.length);
          setOverallScore(avg);
        }
      } catch (err) {
        console.error("Failed to load skills details", err);
      } finally {
        setLoading(false);
      }
    }
    loadSkills();
  }, []);

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">My Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and improve your abilities</p>
        </div>
        <Link
          to="/skills/add"
          className="h-11 w-11 rounded-2xl bg-gradient-primary text-white flex items-center justify-center shadow-glow"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">Overall Skill Score</p>
                <p className="text-4xl font-bold mt-1">{overallScore}/100</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                ✓
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${overallScore}%` }} />
            </div>
          </div>

          {/* Skill Gap Analysis Section */}
          {gapData && (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-border/15">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-base text-foreground">Gap Analysis: {gapData.targetRole}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Required vs current levels to land this role</p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {gapData.matchPercentage}% Match
                </span>
              </div>
              
              <div className="space-y-4 mt-3">
                {gapData.skills.map((s: any) => {
                  const isCritical = s.status === "Critical Gap";
                  const isNeedsWork = s.status === "Needs Improvement";
                  return (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-card-foreground font-bold">{s.name}</span>
                        <span className={`font-bold ${isCritical ? "text-destructive" : isNeedsWork ? "text-warning" : "text-success"}`}>
                          {s.current}% / {s.required}% ({s.status})
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex gap-0.5 relative">
                        <div 
                          className={`h-full rounded-l-full ${isCritical ? "bg-destructive" : isNeedsWork ? "bg-warning" : "bg-success"}`} 
                          style={{ width: `${s.current}%` }} 
                        />
                        {s.gap < 0 && (
                          <div 
                            className="h-full bg-primary/20 border-l border-dashed border-card" 
                            style={{ width: `${Math.min(100 - s.current, Math.abs(s.gap))}%` }} 
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Added Skills Section */}
          <div className="rounded-3xl p-5 bg-card shadow-card border border-border/15">
            <h3 className="font-bold text-base text-foreground mb-3">Your Skills Profile</h3>
            <div className="space-y-3">
              {skillsList.length > 0 ? (
                skillsList.map((s) => (
                  <div
                    key={s.name}
                    className="p-4.5 rounded-2xl bg-muted/30 border border-border/10 flex flex-col gap-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`h-11 w-11 rounded-xl ${s.color} flex items-center justify-center text-white shrink-0`}>
                          <s.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Proficiency: {s.proficiency} ({s.level}%)</p>
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (confirm(`Are you sure you want to delete ${s.name}?`)) {
                            try {
                              await api.deleteSkill(s.id);
                              toast.success("Skill deleted successfully");
                              setSkillsList(prev => prev.filter(item => item.id !== s.id));
                            } catch (err: any) {
                              toast.error(err.message || "Failed to delete skill");
                            }
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all duration-200 cursor-pointer shrink-0"
                        title="Delete Skill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.level}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No skills added yet.</p>
              )}
            </div>
          </div>

          {/* Assessments Completed Section */}
          {assessments.length > 0 && (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-border/15">
              <h3 className="font-bold text-base text-foreground mb-3">Completed Assessments</h3>
              <div className="space-y-3">
                {assessments.map((a: any) => (
                  <div key={a._id} className="flex justify-between items-center p-3.5 rounded-2xl bg-muted/40 border border-border/15">
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{a.category}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Completed: {new Date(a.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      a.score >= 80 ? "bg-success/10 text-success" : a.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>
                      Score: {a.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Recommendations Section */}
          {gapData && gapData.skills.some((s: any) => s.status !== "Met") && (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-border/15">
              <h3 className="font-bold text-base text-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-primary" /> Learning Recommendations
              </h3>
              <div className="space-y-3">
                {gapData.skills.filter((s: any) => s.status !== "Met").slice(0, 3).map((s: any) => {
                  let recCourse = "Advanced " + s.name;
                  if (s.name.includes("SQL")) recCourse = "SQL & Database Administration";
                  if (s.name.includes("Python")) recCourse = "Python for Data Science Foundations";
                  if (s.name.includes("MLOps")) recCourse = "MLOps: Deploying ML Models to Production";
                  if (s.name.includes("React")) recCourse = "React Development & Architectures";
                  if (s.name.includes("Cloud")) recCourse = "Cloud Architectures & Microservices";
                  if (s.name.includes("Security")) recCourse = "Network Security & Penetration Testing";

                  return (
                    <div key={s.name} className="p-4 rounded-2xl bg-muted/30 border border-border/10">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-warning">Focus Area: {s.name} Gap</span>
                      </div>
                      <p className="text-sm font-bold mt-1 text-card-foreground">{recCourse}</p>
                      <Link to="/courses" className="text-xs text-primary font-bold inline-block mt-2 hover:underline">
                        Explore Course Resources →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
