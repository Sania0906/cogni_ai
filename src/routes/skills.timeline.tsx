import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/skills/timeline")({
  head: () => ({ meta: [{ title: "Skill Timeline — CognifyAI" }] }),
  component: Timeline,
});

const events = [
  { date: "May 2026", title: "Mastered Machine Learning", desc: "Reached level 87" },
  { date: "Apr 2026", title: "Completed Python Cert", desc: "AI Foundations track" },
  { date: "Mar 2026", title: "Started SQL Path", desc: "Database fundamentals" },
  { date: "Feb 2026", title: "Joined CognifyAI", desc: "Initial skill assessment" },
];

function Timeline() {
  return (
    <AppShell>
      <PageHeader title="Skill Timeline" back="/skills" />
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6">
        <p className="text-sm text-white/80">Skill progression</p>
        <p className="text-3xl font-bold mt-1">4 milestones</p>
        <p className="text-sm text-white/80 mt-1">this year</p>
      </div>
      <div className="relative pl-6">
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-border" />
        {events.map((e) => (
          <div key={e.title} className="relative pb-6">
            <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <p className="text-xs text-muted-foreground">{e.date}</p>
            <p className="font-bold mt-1">{e.title}</p>
            <p className="text-sm text-muted-foreground">{e.desc}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
