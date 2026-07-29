import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building,
  Briefcase,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Target,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/company-readiness")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Company Readiness — CognifyAI" }] }),
  component: CompanyReadiness,
});

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Adobe",
  "Apple",
  "Meta",
  "Netflix",
  "TCS",
  "Infosys",
  "Accenture",
  "IBM",
  "Cognizant",
  "Zoho",
];

const ROLES = [
  "Software Engineer",
  "AI Engineer",
  "Data Scientist",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "ML Engineer",
];

function CompanyReadiness() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    // Fetch latest report on load
    api
      .getLatestCompanyReadiness()
      .then((res) => {
        if (res && res.company_name) {
          setReport(res);
          setSelectedCompany(res.company_name);
          setSelectedRole(res.target_role);
        }
      })
      .catch(() => {
        // Ignore if no previous report
      });
  }, []);

  const handleAnalyze = async () => {
    if (!selectedCompany || !selectedRole) {
      toast.error("Please select both a company and a role.");
      return;
    }

    setAnalyzing(true);
    try {
      // Minimum delay for UI polish
      await new Promise((r) => setTimeout(r, 1500));
      const result = await api.generateCompanyReadiness(
        selectedCompany,
        selectedRole,
      );
      setReport(result);
      toast.success("Readiness analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
          <Building className="h-8 w-8 text-primary" />
          Company Readiness Analysis
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare your uploaded resume against specific company and role
          requirements.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Form */}
        <div className="col-span-1 space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Target Selection
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Select Company
                </label>
                <select
                  className="w-full bg-background border border-border/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a company...
                  </option>
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Select Role
                </label>
                <select
                  className="w-full bg-background border border-border/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a role...
                  </option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedCompany || !selectedRole}
                className="w-full mt-4 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {analyzing ? "Analyzing Profile..." : "Analyze Readiness"}
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="col-span-1 lg:col-span-2">
          {analyzing ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-3xl bg-card border border-border/10 shadow-card">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-muted border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-lg font-bold animate-pulse text-center">
                Comparing your resume against {selectedCompany}'s hiring
                heuristics for {selectedRole}...
              </p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Score Header */}
              <div className="p-8 rounded-3xl bg-gradient-primary text-white shadow-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="h-32 w-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="relative h-32 w-32 flex items-center justify-center shrink-0">
                    <svg className="h-full w-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        className="stroke-white/20"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        className="stroke-white drop-shadow-md"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray="351.85"
                        strokeDashoffset={
                          351.85 - (351.85 * report.readiness_score) / 100
                        }
                        style={{
                          transition: "stroke-dashoffset 1s ease-in-out",
                        }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black">
                        {report.readiness_score}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                        Score
                      </span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black mb-2">
                      {report.company_name} Readiness
                    </h2>
                    <p className="text-white/90 text-sm">
                      Based on your latest uploaded resume, your profile has a{" "}
                      {report.readiness_score}% alignment for the{" "}
                      <strong className="text-white">
                        {report.target_role}
                      </strong>{" "}
                      role at {report.company_name}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Missing Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-card border border-border/10 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Missing
                    Technical Skills
                  </h3>
                  {report.missing_skills?.technical?.length > 0 ? (
                    <ul className="space-y-2">
                      {report.missing_skills.technical.map(
                        (s: string, i: number) => (
                          <li
                            key={i}
                            className="text-sm flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />{" "}
                            <span className="capitalize">{s}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Strong technical
                      alignment!
                    </p>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-card border border-border/10 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Missing
                    Project Experience
                  </h3>
                  {report.missing_skills?.projects?.length > 0 ? (
                    <ul className="space-y-2">
                      {report.missing_skills.projects.map(
                        (s: string, i: number) => (
                          <li
                            key={i}
                            className="text-sm flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />{" "}
                            Projects using{" "}
                            <span className="capitalize">{s}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Project portfolio
                      looks good!
                    </p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-6 rounded-3xl bg-card border border-border/10 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Personalized
                  Action Plan
                </h3>
                <div className="space-y-3">
                  {report.recommendations?.map((rec: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-start p-3 rounded-xl bg-primary/5 border border-primary/10"
                    >
                      <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm font-medium leading-relaxed">
                        {rec}
                      </p>
                    </div>
                  ))}
                  {(!report.recommendations ||
                    report.recommendations.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      You are highly aligned with this role! Start applying.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-3xl bg-card border border-dashed border-border/40 text-center">
              <Briefcase className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground">
                Select your target
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Choose a company and a role to see how your current resume
                stacks up against their hiring bar.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
