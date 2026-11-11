import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Users, Globe, Briefcase, Star, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({ meta: [{ title: "Company Profile — CognifyAI" }] }),
  component: Company,
});

function Company() {
  const { companyId } = Route.useParams();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompany() {
      try {
        setLoading(true);
        const data = await api.getCompanyById(companyId);
        setCompany(data);
      } catch (err: any) {
        setError(err.message || "Failed to load company profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, [companyId]);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Company" back="/jobs" />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !company) {
    return (
      <AppShell>
        <PageHeader title="Company" back="/jobs" />
        <div className="rounded-3xl p-8 bg-card shadow-card text-center mt-6">
          <p className="text-destructive font-bold text-lg mb-2">Company Not Found</p>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "The requested employer profile could not be retrieved."}
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm"
          >
            Explore Jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const initials = (company.name || "CO")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const openRoles = Array.isArray(company.open_roles) ? company.open_roles : [];

  return (
    <AppShell>
      <PageHeader title="Company" back="/jobs" />

      {/* Header Profile Card */}
      <div className="rounded-3xl p-6 bg-card shadow-card text-center">
        <div className="h-20 w-20 rounded-3xl bg-gradient-primary text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-glow">
          {initials}
        </div>
        <h2 className="text-2xl font-bold mt-3 text-foreground">{company.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {company.tagline || "Enterprise technology and engineering innovation"}
        </p>
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {company.location || "Remote-first"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-primary" /> {company.headcount || "200+ employees"}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-primary" /> {company.type || "Global Enterprise"}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { l: "Rating", v: company.rating || "4.8", icon: Star },
          { l: "Openings", v: `${openRoles.length}`, icon: Briefcase },
          { l: "Match", v: `${company.match_percentage || 92}%`, icon: Globe },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-card p-3.5 shadow-card text-center">
            <p className="text-xl font-bold text-foreground">{s.v}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* About Section */}
      <h3 className="text-lg font-bold mt-6 mb-2">About {company.name}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {company.about ||
          `${company.name} is a high-growth technology organization building scalable infrastructure, predictive data workflows, and modern web applications.`}
      </p>

      {/* Open Roles */}
      <h3 className="text-lg font-bold mt-6 mb-3">Open Roles ({openRoles.length})</h3>
      <div className="space-y-3">
        {openRoles.map((r: any) => (
          <Link
            key={r.id || r.title}
            to="/job/$jobId"
            params={{ jobId: r.id || "job_1" }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card hover:bg-card/90 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {r.loc || "Remote"} · {r.type || "Full-time"} {r.salary ? `· ${r.salary}` : ""}
              </p>
            </div>
            <span className="text-xs font-bold text-primary">View →</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
