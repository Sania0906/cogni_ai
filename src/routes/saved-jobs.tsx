import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/saved-jobs")({
  head: () => ({ meta: [{ title: "Saved Jobs — CognifyAI" }] }),
  component: Saved,
});

const jobs = [
  { id: "j1", title: "Senior ML Engineer", co: "Cognify Labs", loc: "Remote", salary: "$140k" },
  { id: "j2", title: "Data Scientist", co: "Northwind AI", loc: "NYC", salary: "$120k" },
  { id: "j3", title: "AI Product Manager", co: "Lumen", loc: "SF", salary: "$160k" },
];

function Saved() {
  return (
    <AppShell>
      <PageHeader title="Saved Jobs" back="/jobs" />
      <div className="space-y-3">
        {jobs.map((j) => (
          <Link key={j.id} to="/job/$jobId" params={{ jobId: j.id }} className="flex gap-3 p-4 rounded-2xl bg-card shadow-card">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-white flex items-center justify-center font-bold">
              {j.co[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold">{j.title}</p>
              <p className="text-xs text-muted-foreground">{j.co} · {j.loc}</p>
              <p className="text-xs font-semibold mt-1">{j.salary}</p>
            </div>
            <Bookmark className="h-5 w-5 text-primary fill-primary" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
