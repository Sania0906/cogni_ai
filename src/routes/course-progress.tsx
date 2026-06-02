import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Clock, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/course-progress")({
  head: () => ({ meta: [{ title: "Course Progress — CognifyAI" }] }),
  component: Progress,
});

const items = [
  { name: "Machine Learning Foundations", pct: 72 },
  { name: "Python Pro Patterns", pct: 45 },
  { name: "Data Visualization Mastery", pct: 90 },
  { name: "SQL Deep Dive", pct: 22 },
];

function Progress() {
  return (
    <AppShell>
      <PageHeader title="Course Progress" back="/courses" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: TrendingUp, label: "Active", val: "4" },
          { icon: Clock, label: "Hours", val: "62" },
          { icon: Award, label: "Earned", val: "8" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card text-center">
            <s.icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
            <p className="text-2xl font-bold">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <p className="text-sm text-white/80">Overall completion</p>
        <p className="text-4xl font-bold mt-1">57%</p>
        <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-[57%] bg-white rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.name} className="p-4 rounded-2xl bg-card shadow-card">
            <div className="flex justify-between mb-2">
              <p className="font-semibold text-sm">{c.name}</p>
              <span className="text-xs font-bold">{c.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
