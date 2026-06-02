import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Code, Users, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/interview-prep")({
  head: () => ({ meta: [{ title: "Interview Prep — CognifyAI" }] }),
  component: Interview,
});

const tracks = [
  { name: "Behavioral", count: 24, icon: MessageSquare, color: "bg-gradient-primary" },
  { name: "Technical", count: 48, icon: Code, color: "bg-gradient-blue" },
  { name: "System Design", count: 16, icon: Users, color: "bg-gradient-pink" },
  { name: "ML Concepts", count: 32, icon: BookOpen, color: "bg-gradient-primary" },
];

const questions = [
  "Explain bias-variance tradeoff",
  "Walk through a recent ML project",
  "Design a recommendation system",
  "Tell me about a conflict you resolved",
];

function Interview() {
  return (
    <AppShell>
      <PageHeader title="Interview Prep" back="/career" />
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <p className="text-sm text-white/80">Readiness score</p>
        <p className="text-4xl font-bold mt-1">78%</p>
        <div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full w-[78%] bg-white rounded-full" /></div>
      </div>

      <h3 className="text-lg font-bold mb-3">Practice Tracks</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {tracks.map((t) => (
          <div key={t.name} className="p-4 rounded-2xl bg-card shadow-card">
            <div className={`h-10 w-10 rounded-xl ${t.color} text-white flex items-center justify-center mb-2`}>
              <t.icon className="h-5 w-5" />
            </div>
            <p className="font-bold text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.count} questions</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mb-3">Top Questions</h3>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q} className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-gradient-primary text-white flex items-center justify-center text-sm font-bold">{i + 1}</span>
            <p className="text-sm font-medium flex-1">{q}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
