import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Users, Globe, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({ meta: [{ title: "Company Profile — CognifyAI" }] }),
  component: Company,
});

function Company() {
  return (
    <AppShell>
      <PageHeader title="Company" back="/jobs" />
      <div className="rounded-3xl p-6 bg-card shadow-card text-center">
        <div className="h-20 w-20 rounded-3xl bg-gradient-primary text-white flex items-center justify-center font-bold text-2xl mx-auto">CL</div>
        <h2 className="text-2xl font-bold mt-3">Cognify Labs</h2>
        <p className="text-sm text-muted-foreground">AI infrastructure for the next decade</p>
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Remote-first</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 240+</span>
          <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Global</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {[{ l: "Rating", v: "4.7" }, { l: "Openings", v: "18" }, { l: "Match", v: "92%" }].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-3 shadow-card text-center">
            <p className="text-xl font-bold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mt-6 mb-2">About</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Cognify Labs builds developer-grade ML platforms used by 4,000+ companies worldwide.
      </p>

      <h3 className="text-lg font-bold mt-6 mb-3">Open Roles</h3>
      <div className="space-y-3">
        {["Senior ML Engineer", "Frontend Engineer", "Research Scientist"].map((r, i) => (
          <Link key={r} to="/job/$jobId" params={{ jobId: `j${i + 1}` }} className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card">
            <Briefcase className="h-5 w-5 text-primary" />
            <p className="font-semibold flex-1 text-sm">{r}</p>
            <span className="text-xs text-muted-foreground">Remote</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
