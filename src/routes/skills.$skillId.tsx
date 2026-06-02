import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Award, BookOpen, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/skills/$skillId")({
  head: () => ({ meta: [{ title: "Skill Details — CognifyAI" }] }),
  component: SkillDetails,
});

function SkillDetails() {
  const { skillId } = Route.useParams();
  const name = decodeURIComponent(skillId).replace(/-/g, " ");
  return (
    <AppShell>
      <PageHeader title="Skill Details" back="/skills" />
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-sm text-white/80">Current Proficiency</p>
        <h2 className="text-2xl font-bold mt-1 capitalize">{name || "Python Programming"}</h2>
        <p className="text-5xl font-bold mt-4">87<span className="text-2xl text-white/70">/100</span></p>
        <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-[87%] bg-white rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {[
          { icon: TrendingUp, label: "Growth", val: "+12%" },
          { icon: Award, label: "Rank", val: "Top 5%" },
          { icon: BookOpen, label: "Courses", val: "8" },
          { icon: Target, label: "Projects", val: "14" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-bold text-lg">{s.val}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">Recommended Courses</h3>
      <div className="space-y-3">
        {["Advanced Concepts", "Real-world Projects", "Certification Prep"].map((c) => (
          <Link key={c} to="/courses" className="block rounded-2xl bg-card p-4 shadow-card">
            <p className="font-semibold">{c}</p>
            <p className="text-xs text-muted-foreground mt-1">4 hrs · 12 lessons</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
