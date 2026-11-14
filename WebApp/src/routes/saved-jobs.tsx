import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bookmark, ArrowRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/saved-jobs")({
  head: () => ({ meta: [{ title: "Saved Jobs — CognifyAI" }] }),
  component: Saved,
});

function Saved() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = async () => {
    try {
      const data = await api.getSavedJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load saved jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();

    const handleFocus = () => loadSaved();
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadSaved();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(loadSaved, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const handleRemove = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.deleteSavedJob(jobId);
      setJobs((prev) => prev.filter((j) => String(j.id) !== String(jobId)));
    } catch (err) {
      console.error("Failed to remove bookmark", err);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Saved Jobs" back="/jobs" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((j) => {
            const companyName = j.co || j.company || "Company";
            const initial = companyName[0] || "C";

            return (
              <div
                key={j.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card hover:bg-card/90 transition-all border border-border/10"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  {initial}
                </div>
                <Link
                  to="/job/$jobId"
                  params={{ jobId: String(j.id) }}
                  className="flex-1 min-w-0"
                >
                  <p className="font-bold text-foreground text-sm truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {companyName} · {j.loc || "Remote"}
                  </p>
                  <p className="text-xs font-semibold text-success mt-1">{j.salary}</p>
                </Link>
                <button
                  onClick={(e) => handleRemove(String(j.id), e)}
                  title="Remove from saved jobs"
                  className="h-10 w-10 rounded-xl bg-muted/60 hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center border-0 cursor-pointer transition-all shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl p-8 bg-card shadow-card text-center my-6">
          <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-foreground">No saved jobs yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Bookmark interesting positions while browsing to review and apply anytime.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-white font-bold text-xs shadow-glow"
          >
            Explore Job Portal <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </AppShell>
  );
}
