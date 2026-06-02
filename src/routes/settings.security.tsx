import { createFileRoute } from "@tanstack/react-router";
import { Shield, Eye, Smartphone, KeyRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/security")({
  head: () => ({ meta: [{ title: "Security — CognifyAI" }] }),
  component: Security,
});

const toggles = [
  { icon: Shield, t: "Two-Factor Authentication", d: "Extra layer of security", on: true },
  { icon: Smartphone, t: "Biometric Login", d: "Use Face ID / Touch ID", on: true },
  { icon: Eye, t: "Privacy Mode", d: "Hide profile from search", on: false },
  { icon: KeyRound, t: "App Passcode", d: "Require code on launch", on: false },
];

function Security() {
  return (
    <AppShell>
      <PageHeader title="Security & Privacy" back="/profile" />
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
            <Toggle defaultOn={t.on} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <div className="w-12 h-7 rounded-full bg-muted peer-checked:bg-gradient-primary transition-colors relative">
        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
      </div>
    </label>
  );
}
