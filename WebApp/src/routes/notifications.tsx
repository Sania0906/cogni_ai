import { createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, Award, BookOpen, Briefcase, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/notifications")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Notifications — CognifyAI" }] }),
  component: Notifications,
});

function Notifications() {
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await api.getNotifications();

        const mapped = (data || []).map((n: any) => {
          let icon = Bell;
          let color = "bg-gradient-primary";

          if (n.type === "job") {
            icon = Briefcase;
            color = "bg-gradient-blue";
          } else if (n.type === "course") {
            icon = BookOpen;
            color = "bg-gradient-pink";
          } else if (n.type === "billing" || n.type === "resume") {
            icon = Award;
            color = "bg-gradient-primary";
          }

          const createdDate = new Date(n.createdAt || n.created_at || Date.now());
          const diffMs = Date.now() - createdDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);

          let time = "Just now";
          if (diffMins >= 1 && diffMins < 60) {
            time = `${diffMins}m ago`;
          } else if (diffHours >= 1 && diffHours < 24) {
            time = `${diffHours}h ago`;
          } else if (diffHours >= 24) {
            time = createdDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }

          return {
            id: n.id || n._id,
            icon,
            t: n.title,
            d: n.message,
            read: Boolean(n.read),
            time,
            color,
          };
        });

        setNotificationsList(mapped);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const handleMarkRead = async (notifId: string) => {
    if (!notifId) return;
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await api.markNotificationRead(notifId);
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Notifications" back="/dashboard" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {notificationsList.length > 0 ? (
            notificationsList.map((n, i) => (
              <div
                key={n.id || i}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`flex gap-4 p-4 rounded-2xl bg-card shadow-card transition-all ${
                  !n.read
                    ? "border border-primary/30 cursor-pointer hover:bg-muted/40"
                    : "opacity-75"
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-2xl ${n.color} text-white flex items-center justify-center shrink-0`}
                >
                  <n.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold leading-tight">{n.t}</p>
                    {n.read ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary">
                        Unread
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    {n.d}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {n.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No notifications yet.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
