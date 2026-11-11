import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText, Download, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — CognifyAI" }] }),
  component: Reports,
});

function Reports() {
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const data = await api.getAdminReports();
        setReportsData(data);
      } catch (err) {
        console.error("Failed to load admin reports", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const allReports = reportsData?.reports || [
    {
      id: "rep_growth_may",
      title: "Monthly Growth Report",
      category: "Growth",
      date: "May 2026",
      size: "2.4 MB",
      color: "bg-gradient-primary",
    },
    {
      id: "rep_skills_q2",
      title: "Skill Demand Forecast Q2",
      category: "Skills",
      date: "Apr 2026",
      size: "1.8 MB",
      color: "bg-gradient-blue",
    },
    {
      id: "rep_engagement_apr",
      title: "User Engagement Insights",
      category: "Growth",
      date: "Apr 2026",
      size: "3.2 MB",
      color: "bg-gradient-pink",
    },
    {
      id: "rep_revenue_mar",
      title: "Revenue & Subscription Breakdown",
      category: "Revenue",
      date: "Mar 2026",
      size: "1.1 MB",
      color: "bg-gradient-primary",
    },
    {
      id: "rep_jobs_mar",
      title: "Job Market & ATS Analysis",
      category: "Skills",
      date: "Mar 2026",
      size: "4.6 MB",
      color: "bg-gradient-blue",
    },
  ];

  const filteredReports = allReports.filter((r: any) => {
    if (activeCategory === "All") return true;
    return r.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleDownload = async (report: any) => {
    try {
      setDownloadingId(report.id);
      const res = await api.downloadAdminReport(report.id);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.id || "report"}_export.json`;
      a.click();
    } catch (err) {
      console.error("Failed to download report", err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  return (
    <AdminShell title="Reports">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow mb-5">
        <p className="text-sm text-white/80">Reports generated</p>
        <p className="text-4xl font-bold mt-1">
          {reportsData?.totalGenerated || 128}
        </p>
        <p className="text-xs text-white/80 mt-1">
          {reportsData?.quarterGenerated || 42} this quarter · Ready for export
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["All", "Growth", "Skills", "Revenue"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveCategory(t)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border-0 cursor-pointer ${
              t === activeCategory
                ? "bg-gradient-primary text-white shadow-glow"
                : "bg-card text-muted-foreground hover:bg-card/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((r: any) => {
            const isDownloading = downloadingId === r.id;

            return (
              <div
                key={r.title}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card border border-border/10"
              >
                <div
                  className={`h-12 w-12 rounded-2xl ${r.color || "bg-gradient-primary"} text-white flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-foreground text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.date} · {r.size} · <span className="font-semibold text-primary">{r.category}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(r)}
                  disabled={isDownloading}
                  title="Download report data"
                  className="h-10 w-10 rounded-xl bg-muted/70 hover:bg-muted text-foreground flex items-center justify-center border-0 cursor-pointer transition-all shrink-0"
                >
                  {isDownloading ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
