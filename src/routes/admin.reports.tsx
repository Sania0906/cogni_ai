import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — CognifyAI" }] }),
  component: Reports,
});

const reports = [
  { title: "Monthly Growth Report", date: "May 2026", size: "2.4 MB", color: "bg-gradient-primary" },
  { title: "Skill Demand Forecast Q2", date: "Apr 2026", size: "1.8 MB", color: "bg-gradient-blue" },
  { title: "User Engagement Insights", date: "Apr 2026", size: "3.2 MB", color: "bg-gradient-pink" },
  { title: "Revenue Breakdown", date: "Mar 2026", size: "1.1 MB", color: "bg-gradient-primary" },
  { title: "Job Market Analysis", date: "Mar 2026", size: "4.6 MB", color: "bg-gradient-blue" },
];

function Reports() {
  return (
    <AdminShell title="Reports">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <p className="text-sm text-white/80">Reports generated</p>
        <p className="text-4xl font-bold mt-1">128</p>
        <p className="text-xs text-white/80 mt-1">42 this quarter</p>
      </div>

      <div className="flex gap-2 mb-4">
        {["All", "Growth", "Skills", "Revenue"].map((t, i) => (
          <button
            key={t}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              i === 0 ? "bg-gradient-primary text-white shadow-glow" : "bg-card text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.title} className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card">
            <div className={`h-12 w-12 rounded-2xl ${r.color} text-white flex items-center justify-center`}>
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.date} · {r.size}</p>
            </div>
            <button className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
