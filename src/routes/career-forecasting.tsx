import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, ShieldAlert, BarChart3, TrendingUp, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/career-forecasting")({
  head: () => ({ meta: [{ title: "Future Career Forecasting — CognifyAI" }] }),
  component: CareerForecasting,
});

interface ForecastingRole {
  name: string;
  risk: number;
  growth: number;
  emerging: boolean;
  notes?: string;
}

function CareerForecasting() {
  const [data, setData] = useState<{
    roles: ForecastingRole[];
    automationDrivers: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCareerForecasting()
      .then(setData)
      .catch((err) => {
        setError(err.message || "Failed to retrieve Career Forecasting report");
      });
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Career Forecasting" back="/career" />
        <div className="rounded-3xl p-6 bg-card border border-destructive/20 text-center space-y-4 max-w-sm mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h3 className="font-bold text-foreground">Locked / Unresolved</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please complete onboarding first (Academic details, Resume scan, and Skill test) to unlock your AI Career Forecasting!
          </p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Career Forecasting" back="/career" />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Career Forecasting" back="/career" />

      {/* Main card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-white/80">Future Market Trends (5-10 Yrs)</p>
            <h2 className="text-2xl font-bold mt-1">Cognitive Automation Era</h2>
            <p className="text-sm text-white/95 mt-1">65% of current entry-level IT tasks automated</p>
          </div>
          <Sparkles className="h-8 w-8 text-white animate-pulse" />
        </div>
      </div>

      {/* Forecasting list */}
      <h3 className="text-base font-bold mb-3 flex items-center gap-1.5"><BarChart3 className="h-5 w-5 text-primary" /> Automation Risk & Growth</h3>
      <div className="space-y-3 mb-6">
        {data.roles.map((item) => (
          <div key={item.name} className="p-4 rounded-2xl bg-card shadow-card border border-border/30">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm leading-tight max-w-[70%]">{item.name}</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                item.risk > 60 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
              }`}>
                {item.risk > 60 ? "High Risk" : "Low Risk"}
              </span>
            </div>

            <div className="space-y-2 mt-3">
              {/* Risk bar */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                  <span className="flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" /> AI Automation Risk</span>
                  <span>{item.risk}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.risk > 60 ? "bg-destructive" : item.risk > 30 ? "bg-warning" : "bg-success"}`}
                    style={{ width: `${item.risk}%` }}
                  />
                </div>
              </div>

              {/* Growth rate */}
              <div className="flex justify-between text-[10px] font-semibold">
                <span className="text-muted-foreground">Market growth index:</span>
                <span className={item.growth > 0 ? "text-success" : "text-destructive"}>
                  {item.growth > 0 ? `+${item.growth}%` : `${item.growth}%`}
                </span>
              </div>

              {item.notes && (
                <p className="text-[10px] text-muted-foreground italic leading-relaxed mt-1">
                  * {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Advice */}
      <div className="p-5 rounded-2xl bg-card shadow-card">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Strategic Adaptability
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The best defense against high automation risk is <span className="font-semibold text-foreground">deep specialized reasoning (ML systems design, security)</span> combined with <span className="font-semibold text-foreground">domain specific translation</span>. Standard boilerplate coding is easily automated, whereas complex microservice integrations and organizational workflows remain highly human-dependent.
        </p>
      </div>
    </AppShell>
  );
}
