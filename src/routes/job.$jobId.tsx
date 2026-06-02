import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Briefcase, DollarSign, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/job/$jobId")({
  head: () => ({ meta: [{ title: "Job Details — CognifyAI" }] }),
  component: JobDetails,
});

function JobDetails() {
  return (
    <AppShell>
      <PageHeader title="Job Details" back="/jobs" />
      <div className="rounded-3xl p-6 bg-card shadow-card">
        <div className="flex items-start justify-between">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center font-bold text-lg">
            CG
          </div>
          <button className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Bookmark className="h-5 w-5" />
          </button>
        </div>
        <h2 className="text-2xl font-bold mt-4">Senior ML Engineer</h2>
        <p className="text-sm text-muted-foreground">Cognify Labs</p>
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> Remote</span>
          <span className="flex items-center gap-1 text-muted-foreground"><Briefcase className="h-4 w-4" /> Full-time</span>
          <span className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-4 w-4" /> $140k–180k</span>
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-primary text-white shadow-glow mt-4">
        <p className="text-sm text-white/80">Match Score</p>
        <p className="text-3xl font-bold mt-1">92%</p>
        <p className="text-xs text-white/80 mt-1">Excellent fit based on your skills</p>
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">About the role</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Build and ship ML systems at scale. Work with state-of-the-art models, mentor engineers, and shape product strategy.
      </p>

      <h3 className="text-lg font-bold mt-6 mb-3">Required Skills</h3>
      <div className="flex flex-wrap gap-2">
        {["Python", "PyTorch", "MLOps", "AWS", "Distributed Systems"].map((s) => (
          <span key={s} className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">{s}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link to="/saved-jobs" className="py-4 text-center rounded-2xl bg-card shadow-card font-semibold">Save</Link>
        <Link to="/applied-jobs" className="py-4 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow">Apply Now</Link>
      </div>
    </AppShell>
  );
}
