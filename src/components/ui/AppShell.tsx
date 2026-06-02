import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Sparkles, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/skills", label: "Skills", icon: Sparkles },
  { to: "/career", label: "Career", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-md grid grid-cols-4 px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2 text-xs"
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span
                className={cn(
                  "font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useEffect } from "react";
import { api } from "@/lib/api/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate({ to: "/login" });
        return;
      }

      const pathname = window.location.pathname;
      if (pathname !== "/profile-completion") {
        api.getProfile()
          .then((profile) => {
            if (profile && profile.onboarding_completed === false) {
              navigate({ to: "/profile-completion" });
            }
          })
          .catch((err) => {
            console.error("AppShell onboarding check error:", err);
          });
      }
    }
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md min-h-screen pb-28 px-5 pt-8">
      {children}
      <BottomNav />
    </div>
  );
}
