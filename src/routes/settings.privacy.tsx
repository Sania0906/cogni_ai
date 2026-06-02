import { createFileRoute } from "@tanstack/react-router";
import { Eye, MapPin, Database, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/privacy")({
  head: () => ({ meta: [{ title: "Privacy — CognifyAI" }] }),
  component: Privacy,
});

const toggles = [
  { icon: Eye, t: "Public Profile", d: "Show profile to everyone", on: true },
  { icon: MapPin, t: "Location Sharing", d: "Match jobs near you", on: false },
  { icon: Database, t: "Personalized Data", d: "Improve recommendations", on: true },
  { icon: Share2, t: "Share Activity", d: "Show learning to network", on: false },
];

function Privacy() {
  return (
    <AppShell>
      <PageHeader title="Privacy" back="/profile" />
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {toggles.map((t, i) => (
          <div key={t.t} className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="h-11 w-11 rounded-xl bg-gradient-primary text-white flex items-center justify-center">
              <t.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">{t.t}</p>
              <p className="text-xs text-muted-foreground">{t.d}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={t.on} className="peer sr-only" />
              <div className="w-12 h-7 rounded-full bg-muted peer-checked:bg-gradient-primary transition-colors relative">
                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
              </div>
            </label>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
