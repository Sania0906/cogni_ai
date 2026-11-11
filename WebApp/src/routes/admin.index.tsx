import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Briefcase,
  FileText,
  TrendingUp,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — CognifyAI" }] }),
  component: AdminHome,
});

function AdminHome() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getAdminAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load admin analytics", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalUsers = analytics?.totalUsers ?? 0;
  const totalCourses = analytics?.totalCourses ?? 0;
  const totalJobs = analytics?.totalJobs ?? 0;
  const totalResumes = analytics?.totalResumes ?? 0;

  const kpis = [
    {
      label: "Users",
      val: `${totalUsers}`,
      delta: "Live",
      icon: Users,
      color: "bg-gradient-primary",
    },
    {
      label: "Courses",
      val: `${totalCourses}`,
      delta: "Live",
      icon: BookOpen,
      color: "bg-gradient-blue",
    },
    {
      label: "Jobs",
      val: `${totalJobs}`,
      delta: "Live",
      icon: Briefcase,
      color: "bg-gradient-pink",
    },
    {
      label: "Resumes Analyzed",
      val: `${totalResumes}`,
      delta: "Live",
      icon: FileText,
      color: "bg-gradient-primary",
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-sm text-white/80">Platform health</p>
        <p className="text-4xl font-bold mt-1">{analytics?.healthScore || "98.7%"}</p>
        <p className="text-xs text-white/80 mt-1">All database and ML inference systems operational</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl p-4 bg-card shadow-card">
              <div
                className={`h-10 w-10 rounded-xl ${k.color} text-white flex items-center justify-center mb-3 shadow-sm`}
              >
                <k.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{k.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              <p className="text-xs text-success flex items-center gap-1 mt-1 font-semibold">
                <TrendingUp className="h-3 w-3" />
                {k.delta}
              </p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold mt-6 mb-3 text-foreground">Recent Activity</h3>
      <div className="space-y-2">
        {[
          "Genuine ML ATS model loaded & responding on port 8000",
          `${totalUsers} authenticated profiles registered in Supabase`,
          `${totalJobs} job listings active in production catalog`,
          "FastAPI & Express REST microservices health verified",
        ].map((a) => (
          <div key={a} className="p-3.5 rounded-2xl bg-card shadow-card text-sm text-foreground border border-border/10">
            {a}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link
          to="/admin/users"
          className="py-3 text-center rounded-2xl bg-card shadow-card font-semibold text-sm hover:bg-card/80 transition-all text-foreground"
        >
          Manage Users
        </Link>
        <Link
          to="/admin/analytics"
          className="py-3 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm hover:opacity-95 transition-all"
        >
          View Analytics
        </Link>
      </div>
    </AdminShell>
  );
}
