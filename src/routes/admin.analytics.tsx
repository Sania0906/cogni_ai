import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CognifyAI" }] }),
  component: Analytics,
});

const bars = [42, 58, 38, 72, 65, 80, 92, 78, 85, 96, 88, 100];
const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const topSkills = [
  { name: "GenAI", val: 92 },
  { name: "Python", val: 87 },
  { name: "ML", val: 78 },
  { name: "SQL", val: 65 },
  { name: "Rust", val: 54 },
];

function Analytics() {
  return (
    <AdminShell title="Analytics">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-sm text-white/80">Monthly active users</p>
        <p className="text-4xl font-bold mt-1">18.4k</p>
        <div className="flex items-center gap-1 mt-1 text-sm text-white/90">
          <TrendingUp className="h-4 w-4" /> +22.4% vs last month
        </div>
      </div>

      <div className="mt-5 p-5 rounded-2xl bg-card shadow-card">
        <p className="font-bold mb-4">Engagement</p>
        <div className="flex items-end justify-between gap-1.5 h-32">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-primary"
                style={{ height: `${b}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 p-5 rounded-2xl bg-card shadow-card">
        <p className="font-bold mb-4">Top Skills</p>
        <div className="space-y-3">
          {topSkills.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.val}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${s.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        {[{ l: "Sessions", v: "84k" }, { l: "Avg time", v: "12m" }, { l: "Retention", v: "76%" }].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card shadow-card p-4 text-center">
            <p className="text-xl font-bold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
