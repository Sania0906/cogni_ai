import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, BarChart3, FileText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/reports", label: "Reports", icon: FileText },
] as const;

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-md min-h-screen pb-28 px-5 pt-8">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Admin</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="mt-6">{children}</div>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md grid grid-cols-4 px-2 py-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/admin" && pathname.startsWith(to));
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 py-2 text-xs">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                    active ? "bg-gradient-primary text-white shadow-glow" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={cn("font-medium", active ? "text-primary" : "text-muted-foreground")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
