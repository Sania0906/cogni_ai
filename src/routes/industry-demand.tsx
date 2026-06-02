import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, BarChart3, HelpCircle, DollarSign } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/industry-demand")({
  head: () => ({ meta: [{ title: "Industry Demand Intelligence — CognifyAI" }] }),
  component: IndustryDemand,
});

interface MarketCategory {
  name: string;
  growth: number;
  openings: number;
  salary: number;
  trend: string;
}

function IndustryDemand() {
  const [data, setData] = useState<{
    categories: MarketCategory[];
    marketDrivers: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getIndustryDemand()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to load market demand analysis.");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Market Intelligence" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock Market Demand Intelligence!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Market Intelligence" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Market Intelligence" back="/career" />

      {/* Main stats summary */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-white/80">Market Trend Overview</p>
            <h2 className="text-2xl font-bold mt-1">AI/ML Leading Growth</h2>
            <p className="text-sm text-white/95 mt-1">Average wages up 14.5% year-over-year</p>
          </div>
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Trend Grid */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><TrendingUp className="h-5 w-5 text-primary" /> Hiring & Salary Demand</h3>
      <div className="space-y-3 mb-6">
        {data.categories.map((c) => (
          <div key={c.name} className="p-4 rounded-2xl bg-card shadow-card border border-border/30">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm leading-tight max-w-[70%]">{c.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-success">+{c.growth}%</span>
                <span className="text-[10px] text-muted-foreground font-semibold">YoY</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-3 bg-muted/40 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Open Positions</span>
                <p className="text-sm font-bold mt-0.5">{c.openings.toLocaleString()} roles</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center"><DollarSign className="h-3 w-3 text-success shrink-0" /> Average Salary</span>
                <p className="text-sm font-bold mt-0.5">${(c.salary / 1000).toFixed(0)}k/yr</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Market Drivers */}
      <div className="p-5 rounded-2xl bg-card shadow-card">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Key Market Drivers
        </h3>
        <div className="space-y-3">
          {data.marketDrivers.map((drv, idx) => (
            <div key={idx} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p>{drv}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
