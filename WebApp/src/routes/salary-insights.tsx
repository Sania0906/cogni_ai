import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, MapPin, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/salary-insights")({
  head: () => ({ meta: [{ title: "Salary Insights — CognifyAI" }] }),
  component: Salary,
});

function Salary() {
  const [salaryData, setSalaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSalary() {
      try {
        setLoading(true);
        const data = await api.getSalaryInsights();
        setSalaryData(data);
      } catch (err) {
        console.error("Failed to load salary insights", err);
      } finally {
        setLoading(false);
      }
    }
    loadSalary();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Salary Insights" back="/career" />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const roleName = salaryData?.role || "Machine Learning Engineer";
  const average = salaryData?.average ? Math.round(salaryData.average / 1000) : 145;
  const minK = salaryData?.min ? Math.round(salaryData.min / 1000) : 110;
  const maxK = salaryData?.max ? Math.round(salaryData.max / 1000) : 195;
  const growth = salaryData?.growthPercent || 16.5;

  const percentiles = Array.isArray(salaryData?.percentiles) ? salaryData.percentiles : [
    { percentile: "10th", amount: 110000 },
    { percentile: "25th", amount: 125000 },
    { percentile: "50th (Median)", amount: 145000 },
    { percentile: "75th", amount: 170000 },
    { percentile: "90th", amount: 195000 },
  ];

  const byCity = Array.isArray(salaryData?.byCity) ? salaryData.byCity : [
    { city: "San Francisco, CA", amount: 165000 },
    { city: "New York, NY", amount: 155000 },
    { city: "Remote (US)", amount: 142000 },
    { city: "Austin, TX", amount: 135000 },
  ];

  return (
    <AppShell>
      <PageHeader title="Salary Insights" back="/career" />

      {/* Hero Banner */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <div className="flex justify-between items-start">
          <p className="text-sm text-white/80">Estimated Compensation · {roleName}</p>
          <DollarSign className="h-6 w-6 text-white/80" />
        </div>
        <p className="text-4xl font-bold mt-2">${average}k<span className="text-lg text-white/70 font-normal"> / year</span></p>
        <div className="flex items-center gap-1.5 mt-2 text-sm text-white/90">
          <TrendingUp className="h-4 w-4" /> +{growth}% industry growth trend
        </div>
      </div>

      {/* Percentiles Breakdown */}
      <h3 className="text-lg font-bold mb-3 flex items-center gap-1.5">
        <BarChart3 className="h-5 w-5 text-primary" /> Percentile Distribution
      </h3>
      <div className="space-y-3 mb-6">
        {percentiles.map((p: any) => {
          const amtK = Math.round(p.amount / 1000);
          const pct = Math.min(100, Math.max(10, Math.round((amtK / 220) * 100)));

          return (
            <div key={p.percentile} className="p-4 rounded-2xl bg-card shadow-card">
              <div className="flex justify-between mb-1.5 text-sm">
                <span className="font-semibold text-foreground">{p.percentile}</span>
                <span className="font-bold text-success">${amtK}k</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Regional City Comp */}
      <h3 className="text-lg font-bold mb-3 flex items-center gap-1.5">
        <MapPin className="h-5 w-5 text-primary" /> By Geographic Market
      </h3>
      <div className="space-y-2 mb-6">
        {byCity.map((c: any) => (
          <div
            key={c.city}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card shadow-card"
          >
            <span className="text-sm font-semibold text-foreground">{c.city}</span>
            <span className="text-sm font-bold text-foreground">
              ${Math.round(c.amount / 1000)}k
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
