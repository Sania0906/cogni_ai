import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/job-recommendation")({


  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Job Recommendations — CognifyAI" }] }),
  component: JobRecommendation,
});

function JobRecommendation() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await api.getJobRecommendations();
        setJobs(data);
      } catch (err) {
        console.error("Failed to load job recommendations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  return (
    <AppShell>
      <PageHeader title="AI Job Role Recommendations" back="/dashboard" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{job.title}</h3>
                  <p className="text-xs text-muted-foreground font-semibold">{job.company}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                  {job.matchPercentage}% Match
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/40 text-xs font-bold text-primary">
                💰 Salary: {job.salaryRange}
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills?.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {job.learningRoadmap && (
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Learning Roadmap</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {job.learningRoadmap.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
