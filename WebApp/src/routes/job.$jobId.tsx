import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Briefcase, DollarSign, Bookmark, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/job/$jobId")({
  head: () => ({ meta: [{ title: "Job Details — CognifyAI" }] }),
  component: JobDetails,
});

function JobDetails() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const data = await api.getJobById(jobId);
        setJob(data);
        setIsSaved(Boolean(data?.is_saved));
        setApplied(Boolean(data?.is_applied));
      } catch (err: any) {
        setError(err.message || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId]);

  const toggleSave = async () => {
    try {
      if (isSaved) {
        await api.deleteSavedJob(jobId);
        setIsSaved(false);
      } else {
        await api.saveJob(jobId);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
    }
  };

  const handleApply = async () => {
    try {
      setIsApplying(true);
      await api.applyJob(jobId);
      setApplied(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit job application.");
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Job Details" back="/jobs" />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell>
        <PageHeader title="Job Details" back="/jobs" />
        <div className="rounded-3xl p-8 bg-card shadow-card text-center mt-6">
          <p className="text-destructive font-bold text-lg mb-2">Job Not Found</p>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "The requested job position could not be located in our database."}
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm"
          >
            Browse Open Positions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const companyInitials = (job.company || "CG")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : ["Python", "Machine Learning", "FastAPI", "PostgreSQL", "Docker"];

  return (
    <AppShell>
      <PageHeader title="Job Details" back="/jobs" />
      <div className="rounded-3xl p-6 bg-card shadow-card">
        <div className="flex items-start justify-between">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center font-bold text-lg">
            {companyInitials}
          </div>
          <button
            onClick={toggleSave}
            title={isSaved ? "Remove from bookmarks" : "Bookmark this job"}
            className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border-0 ${
              isSaved
                ? "bg-primary text-white shadow-glow"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? "fill-white" : ""}`} />
          </button>
        </div>
        <h2 className="text-2xl font-bold mt-4">{job.title}</h2>
        <Link
          to="/company/$companyId"
          params={{ companyId: job.company_id || "comp_" + (job.company || "techcorp").toLowerCase().replace(/\s+/g, "") }}
          className="text-sm font-medium text-primary hover:underline inline-block mt-1"
        >
          {job.company}
        </Link>
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {job.loc || "Remote"}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Briefcase className="h-4 w-4 text-primary" /> {job.type || "Full-time"}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground font-semibold">
            <DollarSign className="h-4 w-4 text-success" /> {job.salary || "$130k - $165k"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-primary text-white shadow-glow mt-4">
        <p className="text-sm text-white/80">Match Score</p>
        <p className="text-3xl font-bold mt-1">{job.match || 90}%</p>
        <p className="text-xs text-white/80 mt-1">
          {job.match && job.match >= 85
            ? "Strong match based on your verified skills and resume profile"
            : "Good potential alignment with opportunity to bridge targeted skills"}
        </p>
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">About the role</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {job.description ||
          "Lead technical architecture, deploy scalable high-throughput microservices, and collaborate closely with product and data engineering stakeholders to deliver mission-critical platform capabilities."}
      </p>

      {job.about && (
        <>
          <h3 className="text-lg font-bold mt-6 mb-2">About the Company</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{job.about}</p>
        </>
      )}

      <h3 className="text-lg font-bold mt-6 mb-3">Required Skills</h3>
      <div className="flex flex-wrap gap-2">
        {requirements.map((s: string) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={toggleSave}
          className={`py-4 text-center rounded-2xl font-semibold transition-all border-0 cursor-pointer ${
            isSaved ? "bg-muted text-foreground" : "bg-card shadow-card text-foreground"
          }`}
        >
          {isSaved ? "Bookmarked ✓" : "Save Job"}
        </button>

        {applied ? (
          <div className="py-4 text-center rounded-2xl bg-success/20 text-success font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-5 w-5" /> Applied
          </div>
        ) : (
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="py-4 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow border-0 cursor-pointer hover:opacity-95 disabled:opacity-50"
          >
            {isApplying ? "Submitting..." : "Apply Now"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
