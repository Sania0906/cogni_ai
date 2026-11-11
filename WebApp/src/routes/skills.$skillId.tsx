import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, Award, BookOpen, Target, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/skills/$skillId")({
  head: () => ({ meta: [{ title: "Skill Details — CognifyAI" }] }),
  component: SkillDetails,
});

function SkillDetails() {
  const { skillId } = Route.useParams();
  const [skill, setSkill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkill() {
      try {
        setLoading(true);
        const data = await api.getSkillById(skillId);
        setSkill(data);
      } catch (err: any) {
        setError(err.message || "Failed to load skill details.");
      } finally {
        setLoading(false);
      }
    }
    loadSkill();
  }, [skillId]);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Skill Details" back="/skills" />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !skill) {
    return (
      <AppShell>
        <PageHeader title="Skill Details" back="/skills" />
        <div className="rounded-3xl p-8 bg-card shadow-card text-center mt-6">
          <p className="text-destructive font-bold text-lg mb-2">Skill Not Found</p>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "Unable to retrieve proficiency data for this skill."}
          </p>
          <Link
            to="/skills"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm"
          >
            Back to Skills Inventory <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const proficiency = skill.progress ?? 75;
  const recommendedCourses = Array.isArray(skill.recommendedCourses) ? skill.recommendedCourses : [];

  return (
    <AppShell>
      <PageHeader title="Skill Details" back="/skills" />

      {/* Hero Proficiency Card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <div className="flex justify-between items-center">
          <p className="text-sm text-white/80">Current Proficiency</p>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
            {skill.level || "Intermediate"}
          </span>
        </div>
        <h2 className="text-2xl font-bold mt-1 capitalize text-white">
          {skill.name}
        </h2>
        <p className="text-5xl font-bold mt-4">
          {proficiency}
          <span className="text-2xl text-white/70">/100</span>
        </p>
        <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, proficiency))}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {[
          { icon: TrendingUp, label: "Growth", val: skill.growth || "+14%" },
          { icon: Award, label: "Benchmark Rank", val: skill.rank || "Top 10%" },
          { icon: BookOpen, label: "Curricula", val: `${skill.coursesCount || 3}` },
          { icon: Target, label: "Practical Projects", val: `${skill.projectsCount || 8}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-bold text-lg text-foreground mt-0.5">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Recommended Courses */}
      <h3 className="text-lg font-bold mt-6 mb-3">Recommended Courses</h3>
      <div className="space-y-3">
        {recommendedCourses.map((c: any) => (
          <Link
            key={c.title}
            to="/courses"
            className="block rounded-2xl bg-card p-4 shadow-card hover:bg-card/90 transition-all border border-border/10"
          >
            <p className="font-semibold text-foreground text-sm">{c.title}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>{c.duration}</span>
              <span className="text-primary font-bold">Start Learning →</span>
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
