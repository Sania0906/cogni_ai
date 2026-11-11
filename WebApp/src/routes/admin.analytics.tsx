import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, Users, Activity, Clock } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CognifyAI" }] }),
  component: Analytics,
});

function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await api.getAdminAnalytics();
        setData(res);
      } catch (err) {
        console.error("Failed to load admin analytics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const bars = data?.engagementBars || [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const topSkills = data?.topSkills || [];

  const mau = data?.monthlyActiveUsers ?? "0";
  const stats = data?.stats || [
    { l: "ATS Scans", v: "0" },
    { l: "Avg ATS", v: "0%" },
    { l: "Assessments", v: "0" },
  ];

  return (
    <AdminShell title="Analytics">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-sm text-white/80">Monthly active users</p>
        <p className="text-4xl font-bold mt-1">{mau}</p>
        <div className="flex items-center gap-1 mt-1 text-sm text-white/90 font-medium">
          <TrendingUp className="h-4 w-4" /> {data?.monthlyGrowth || "+22.4%"} vs last month
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mt-5 p-5 rounded-2xl bg-card shadow-card">
            <p className="font-bold mb-4 text-foreground">Cohort Engagement</p>
            <div className="flex items-end justify-between gap-1.5 h-32">
              {bars.map((b: number, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-primary transition-all duration-500"
                    style={{ height: `${b}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {months[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 p-5 rounded-2xl bg-card shadow-card">
            <p className="font-bold mb-4 text-foreground">Top Evaluated Competencies</p>
            <div className="space-y-3">
              {topSkills.map((s: any) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground font-bold">{s.val}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${s.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {stats.map((s: any) => (
              <div
                key={s.l}
                className="rounded-2xl bg-card shadow-card p-4 text-center"
              >
                <p className="text-xl font-bold text-foreground">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
