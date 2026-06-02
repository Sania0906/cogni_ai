import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/applied-jobs")({
  head: () => ({ meta: [{ title: "Applied Jobs — CognifyAI" }] }),
  component: Applied,
});

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

function Applied() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      try {
        const data = await api.getAppliedJobs();
        setApps(data);
      } catch (err) {
        console.error("Failed to load applied jobs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApps();
  }, []);

  return (
    <AppShell>
      <PageHeader title="Applied Jobs" back="/jobs" />
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {apps.length > 0 ? (
            apps.map((j) => (
              <Link key={j.id + j.title} to="/job/$jobId" params={{ jobId: j.id }} className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center font-bold">{j.co[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.co}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white shrink-0 ${j.color || "bg-gradient-primary"}`}>{j.status}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No applications submitted yet.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
