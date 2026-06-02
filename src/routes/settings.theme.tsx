import { createFileRoute } from "@tanstack/react-router";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/theme")({
  head: () => ({ meta: [{ title: "Theme — CognifyAI" }] }),
  component: Theme,
});

function Theme() {
  const [sel, setSel] = useState("light");
  const opts = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <AppShell>
      <PageHeader title="Theme" back="/profile" />
      <div className="space-y-3">
        {opts.map((o) => {
          const active = sel === o.id;
          return (
            <button
              key={o.id}
              onClick={() => {
                setSel(o.id);
                if (o.id === "dark") document.documentElement.classList.add("dark");
                else document.documentElement.classList.remove("dark");
              }}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl shadow-card transition-all ${
                active ? "bg-gradient-primary text-white shadow-glow" : "bg-card"
              }`}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                active ? "bg-white/20" : "bg-gradient-primary text-white"
              }`}>
                <o.icon className="h-5 w-5" />
              </div>
              <span className="font-bold">{o.label}</span>
              {active && <span className="ml-auto text-sm">Active</span>}
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
