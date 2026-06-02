import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, BookOpen, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — CognifyAI" }] }),
  component: AdminHome,
});

const kpis = [
  { label: "Users", val: "24.8k", delta: "+12%", icon: Users, color: "bg-gradient-primary" },
  { label: "Courses", val: "1,284", delta: "+8%", icon: BookOpen, color: "bg-gradient-blue" },
  { label: "Jobs", val: "542", delta: "+24%", icon: Briefcase, color: "bg-gradient-pink" },
  { label: "Revenue", val: "$48k", delta: "+18%", icon: DollarSign, color: "bg-gradient-primary" },
];

function AdminHome() {
  return (
    <AdminShell title="Dashboard">
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-sm text-white/80">Platform health</p>
        <p className="text-4xl font-bold mt-1">98.7%</p>
        <p className="text-xs text-white/80 mt-1">All systems operational</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl p-4 bg-card shadow-card">
            <div className={`h-10 w-10 rounded-xl ${k.color} text-white flex items-center justify-center mb-3`}>
              <k.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{k.val}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" />{k.delta}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {[
          "New course published: GenAI Bootcamp",
          "1,240 users joined this week",
          "Salary insights updated",
          "Job feed refreshed (542 new roles)",
        ].map((a) => (
          <div key={a} className="p-3 rounded-2xl bg-card shadow-card text-sm">{a}</div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link to="/admin/users" className="py-3 text-center rounded-2xl bg-card shadow-card font-semibold text-sm">Manage Users</Link>
        <Link to="/admin/analytics" className="py-3 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm">View Analytics</Link>
      </div>
    </AdminShell>
  );
}
