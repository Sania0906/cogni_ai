import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Settings as SettingsIcon, Shield, Bell, Moon, ChevronRight, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Settings — CognifyAI" }] }),
  component: Settings,
});

const settingsList = [
  { to: "/settings/account", label: "Account Settings", icon: SettingsIcon, color: "bg-gradient-primary" },
  { to: "/settings/security", label: "Security & Privacy", icon: Shield, color: "bg-gradient-blue" },
  { to: "/notifications", label: "Notifications", icon: Bell, color: "bg-gradient-pink" },
  { to: "/settings/theme", label: "Theme", icon: Moon, color: "bg-gradient-primary" },
];

function Settings() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    toast.success("Signed out successfully");
    navigate({ to: "/login" });
  };

  return (
    <AppShell>
      <PageHeader title="Settings" back="/profile" />

      <div className="rounded-3xl bg-card shadow-card overflow-hidden border border-border/10">
        {settingsList.map((s, i) => (
          <Link
            key={s.label}
            to={s.to}
            className={`flex items-center gap-4 p-4 hover:bg-muted/30 transition ${i > 0 ? "border-t border-border/40" : ""}`}
          >
            <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>
              <s.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 font-semibold text-card-foreground text-sm">{s.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button
        onClick={handleSignOut}
        className="mt-6 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-bold cursor-pointer hover:bg-destructive/15 border-0"
      >
        <LogOut className="h-5 w-5" /> Sign Out
      </button>
    </AppShell>
  );
}
