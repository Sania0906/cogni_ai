import { createFileRoute } from "@tanstack/react-router";
import { Bell, Award, BookOpen, Briefcase } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CognifyAI" }] }),
  component: Notifications,
});

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

function Notifications() {
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await api.getNotifications();
        
        // Map to layout format
        const mapped = data.map((n: any) => {
          let icon = Bell;
          let color = "bg-gradient-primary";

          if (n.type === "job") {
            icon = Briefcase;
            color = "bg-gradient-blue";
          } else if (n.type === "course") {
            icon = BookOpen;
            color = "bg-gradient-pink";
          } else if (n.type === "billing") {
            icon = Award;
            color = "bg-gradient-primary";
          }

          // Calculate friendly time
          const createdDate = new Date(n.createdAt);
          const diffMs = Date.now() - createdDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          
          let time = "Just now";
          if (diffMins >= 1 && diffMins < 60) {
            time = `${diffMins}m ago`;
          } else if (diffHours >= 1 && diffHours < 24) {
            time = `${diffHours}h ago`;
          } else if (diffHours >= 24) {
            time = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }

          return {
            icon,
            t: n.title,
            d: n.message,
            time,
            color
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

  return (
    <AppShell>
      <PageHeader title="Notifications" back="/home" />
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {notificationsList.length > 0 ? (
            notificationsList.map((n, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card shadow-card">
                <div className={`h-12 w-12 rounded-2xl ${n.color} text-white flex items-center justify-center shrink-0`}>
                  <n.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight">{n.t}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{n.d}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{n.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications yet.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
