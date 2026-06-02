import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, TrendingUp, MapPin, Briefcase } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Job Search — CognifyAI" }] }),
  component: Jobs,
});

function Jobs() {
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await api.getJobs();
        setJobsList(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  return (
    <AppShell>
      <PageHeader title="Job Search" back="/career" />

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Job title or keyword..."
            className="w-full h-14 rounded-2xl bg-card shadow-card pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
          />
        </div>
        <div className="flex gap-3">
          <input
            placeholder="Location"
            className="flex-1 h-14 rounded-2xl bg-card shadow-card px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
          />
          <button className="h-14 w-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center shadow-glow border-0">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl p-5 bg-gradient-primary text-white shadow-glow flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{loading ? "..." : jobsList.length}</p>
          <p className="text-sm text-white/80">matching jobs found</p>
        </div>
        <TrendingUp className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold mt-6 mb-3">Recommended for You</h2>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {jobsList.length > 0 ? (
            jobsList.map((j) => (
              <div key={j._id || j.title} className="p-5 rounded-2xl bg-card shadow-card border border-border/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-sm text-foreground">{j.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{j.company}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                    {j.match || 75}%
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.loc}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.type}</span>
                </div>
                <p className="text-success text-sm font-bold mt-2">{j.salary}</p>
                <button className="w-full h-11 mt-3.5 rounded-xl bg-gradient-primary text-white font-bold text-xs border-0 cursor-pointer shadow-glow">
                  View Details
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No matching jobs found.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
