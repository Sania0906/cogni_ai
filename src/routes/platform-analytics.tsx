import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, BarChart3, TrendingUp, Tablet, Monitor } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/platform-analytics")({
  head: () => ({ meta: [{ title: "Platform Analytics — CognifyAI" }] }),
  component: PlatformAnalytics,
});

interface AnalyticsMetric {
  name: string;
  android: number;
  web: number;
  unit: string;
  desc?: string;
}

interface GrowthPoint {
  month: string;
  android: number;
  web: number;
}

function PlatformAnalytics() {
  const [data, setData] = useState<{
    metrics: AnalyticsMetric[];
    platformGrowth: GrowthPoint[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPlatformAnalytics()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to load platform analytics.");
      });
  }, []);

  if (error) {
    return (
      <AdminShell title="Platform Analytics">
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Access Denied</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error}. You do not have permissions or there was an error retrieving platform statistics.
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell title="Platform Analytics">
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Platform Analytics">
      {/* Overview Card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Platform Engagement Ratio</p>
            <h2 className="text-3xl font-bold mt-1">62% Web vs 38% Mobile</h2>
            <div className="flex items-center gap-1 mt-1 text-sm text-white/90">
              <TrendingUp className="h-4 w-4" /> Mobile traffic up 18% YoY
            </div>
          </div>
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Comparisons */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><Users className="h-5 w-5 text-primary" /> Web vs Android Engagement</h3>
      <div className="space-y-3 mb-6">
        {data.metrics.map((m) => {
          const maxVal = Math.max(m.android, m.web);
          const webPct = (m.web / maxVal) * 100;
          const androidPct = (m.android / maxVal) * 100;

          return (
            <div key={m.name} className="p-4 rounded-2xl bg-card shadow-card border border-border/30">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs">{m.name}</span>
                <span className="text-[10px] text-muted-foreground">{m.desc}</span>
              </div>

              {/* Bar displays */}
              <div className="space-y-2 mt-3">
                {/* Web Bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-semibold">
                    <span className="flex items-center gap-1 text-primary"><Monitor className="h-3 w-3" /> Web client</span>
                    <span>{m.web} {m.unit}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${webPct}%` }} />
                  </div>
                </div>

                {/* Android Bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-semibold">
                    <span className="flex items-center gap-1 text-pink"><Tablet className="h-3 w-3" /> Android app</span>
                    <span>{m.android} {m.unit}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-pink rounded-full" style={{ width: `${androidPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Growth Comparison chart (HTML CSS visual) */}
      <div className="p-5 rounded-2xl bg-card shadow-card mb-6">
        <p className="font-bold text-sm mb-4">Traffic Acquisition Trends</p>
        <div className="flex items-end justify-between gap-3 h-32 pt-2 border-b border-border/40">
          {data.platformGrowth.map((g) => {
            const maxVal = 24800; // May Web
            const webHeight = (g.web / maxVal) * 90;
            const androidHeight = (g.android / maxVal) * 90;

            return (
              <div key={g.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="flex w-full items-end gap-1 justify-center h-full">
                  {/* Web */}
                  <div 
                    className="w-2.5 rounded-t-sm bg-gradient-primary" 
                    style={{ height: `${webHeight}%` }}
                  />
                  {/* Android */}
                  <div 
                    className="w-2.5 rounded-t-sm bg-gradient-pink" 
                    style={{ height: `${androidHeight}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{g.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 justify-center text-[10px] text-muted-foreground font-semibold">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-primary inline-block" /> Web traffic</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-pink inline-block" /> Android traffic</span>
        </div>
      </div>
    </AdminShell>
  );
}
