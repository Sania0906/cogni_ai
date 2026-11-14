import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Filter, TrendingUp, MapPin, Briefcase, Bookmark, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Jobs — CognifyAI" }] }),
  component: Jobs,
});

function Jobs() {
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const loadData = async () => {
    try {
      const [jobsData, savedData] = await Promise.allSettled([
        api.getJobs(),
        api.getSavedJobs(),
      ]);

      if (jobsData.status === "fulfilled" && Array.isArray(jobsData.value)) {
        setJobsList(jobsData.value);
      }
      if (savedData.status === "fulfilled" && Array.isArray(savedData.value)) {
        const ids = new Set<string>(savedData.value.map((s: any) => String(s.job_id || s.id)));
        setSavedJobIds(ids);
      }
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(loadData, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const toggleSave = async (jobId: string) => {
    try {
      const isSaved = savedJobIds.has(jobId);
      if (isSaved) {
        await api.deleteSavedJob(jobId);
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        await api.saveJob(jobId);
        setSavedJobIds((prev) => new Set(prev).add(jobId));
      }
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
    }
  };

  const filteredJobs = jobsList.filter((j) => {
    const titleMatch = (j.title || "").toLowerCase().includes(search.toLowerCase()) ||
                       (j.company || "").toLowerCase().includes(search.toLowerCase());
    const locMatch = !locationFilter || (j.loc || "").toLowerCase().includes(locationFilter.toLowerCase());
    return titleMatch && locMatch;
  });

  return (
    <AppShell>
      <PageHeader title="Job Search" back="/career" />

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Job title, company, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 rounded-2xl bg-card shadow-card pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-3">
          <input
            placeholder="Filter by city or Remote..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="flex-1 h-14 rounded-2xl bg-card shadow-card px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold text-foreground placeholder:text-muted-foreground"
          />
          <Link
            to="/saved-jobs"
            className="h-14 px-4 rounded-2xl bg-card shadow-card flex items-center justify-center gap-1.5 text-xs font-bold text-foreground border border-border/15 hover:bg-card/80 transition-all shrink-0"
          >
            <Bookmark className="h-4 w-4 text-primary fill-primary" />
            <span>Saved ({savedJobIds.size})</span>
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="mt-6 rounded-3xl p-5 bg-gradient-primary text-white shadow-glow flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">
            {loading ? "..." : filteredJobs.length}
          </p>
          <p className="text-sm text-white/80">matching positions found</p>
        </div>
        <TrendingUp className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold mt-6 mb-3">Recommended Positions</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((j) => {
              const jobId = j._id || j.id;
              const isSaved = savedJobIds.has(String(jobId));

              return (
                <div
                  key={jobId}
                  className="p-5 rounded-2xl bg-card shadow-card border border-border/10 hover:border-primary/20 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-bold text-base text-foreground truncate">
                        {j.title}
                      </p>
                      <Link
                        to="/company/$companyId"
                        params={{ companyId: j.company_id || "comp_" + (j.company || "tech").toLowerCase().replace(/\s+/g, "") }}
                        className="text-xs text-primary font-medium hover:underline inline-block mt-0.5"
                      >
                        {j.company}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleSave(String(jobId))}
                        title={isSaved ? "Remove bookmark" : "Save job"}
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all border-0 cursor-pointer ${
                          isSaved
                            ? "bg-primary text-white shadow-glow"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? "fill-white" : ""}`} />
                      </button>
                      <div className="h-9 px-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">
                        {j.match || 88}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {j.loc || "Remote"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      {j.type || "Full-time"}
                    </span>
                  </div>

                  <p className="text-success text-sm font-bold mt-2">
                    {j.salary || "$130k - $160k"}
                  </p>

                  <Link
                    to="/job/$jobId"
                    params={{ jobId: String(jobId) }}
                    className="w-full h-11 mt-3.5 rounded-xl bg-gradient-primary text-white font-bold text-xs flex items-center justify-center shadow-glow hover:opacity-95 transition-all cursor-pointer"
                  >
                    View Details & Apply
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl p-8 bg-card shadow-card text-center my-6">
              <p className="font-bold text-foreground">No matching jobs found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Try adjusting your search keywords or location filter.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setLocationFilter("");
                }}
                className="px-4 py-2 rounded-xl bg-muted text-xs font-bold text-foreground border-0 cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
