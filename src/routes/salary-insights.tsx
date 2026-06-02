import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/salary-insights")({
  head: () => ({ meta: [{ title: "Salary Insights — CognifyAI" }] }),
  component: Salary,
});

const roles = [
  { name: "ML Engineer", min: 110, mid: 145, max: 195 },
  { name: "Data Scientist", min: 95, mid: 125, max: 170 },
  { name: "AI Researcher", min: 130, mid: 175, max: 240 },
  { name: "MLOps Engineer", min: 105, mid: 140, max: 185 },
];

function Salary() {
  return (
    <AppShell>
      <PageHeader title="Salary Insights" back="/career" />
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <p className="text-sm text-white/80">Your estimated range</p>
        <p className="text-4xl font-bold mt-1">$145k</p>
        <div className="flex items-center gap-1 mt-1 text-sm text-white/90">
          <TrendingUp className="h-4 w-4" /> +18% above average
        </div>
      </div>

      <h3 className="text-lg font-bold mb-3">By Role</h3>
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.name} className="p-4 rounded-2xl bg-card shadow-card">
            <div className="flex justify-between mb-2">
              <p className="font-bold">{r.name}</p>
              <p className="text-sm font-semibold">${r.mid}k</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden relative">
              <div
                className="absolute h-full bg-gradient-primary rounded-full"
                style={{ left: `${(r.min / 250) * 100}%`, width: `${((r.max - r.min) / 250) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>${r.min}k</span><span>${r.max}k</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
