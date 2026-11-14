import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  Briefcase,
  GraduationCap,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  {
    to: "/dashboard",
    label: "Home",
    icon: Home,
    isActive: (p: string) => p === "/" || p.startsWith("/dashboard"),
  },
  {
    to: "/jobs",
    label: "Jobs",
    icon: Briefcase,
    isActive: (p: string) => p.startsWith("/jobs") || p.startsWith("/job"),
  },
  {
    to: "/courses",
    label: "Courses",
    icon: GraduationCap,
    isActive: (p: string) =>
      p.startsWith("/courses") ||
      p.startsWith("/course") ||
      p.startsWith("/learning"),
  },
  {
    to: "/resume-analysis",
    label: "Resume",
    icon: FileText,
    isActive: (p: string) => p.startsWith("/resume"),
  },
  {
    to: "/profile",
    label: "Settings",
    icon: Settings,
    isActive: (p: string) =>
      p.startsWith("/profile") || p.startsWith("/settings"),
  },
] as const;

// DesktopNav is deprecated to satisfy the strict requirement of having ONLY the bottom navigation bar.
export function DesktopNav() {
  return null;
}

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl shadow-lg">
      <div className="mx-auto max-w-md md:max-w-xl lg:max-w-2xl grid grid-cols-5 px-3 py-2">
        {navItems.map(({ to, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-1.5 text-xs select-none transition-transform active:scale-95"
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span
                className={cn(
                  "font-medium text-[11px]",
                  active ? "text-primary font-bold" : "text-muted-foreground",
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <main className="mx-auto w-full max-w-md md:max-w-xl lg:max-w-3xl flex-1 pb-32 px-5 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
