import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/subscription")({
  head: () => ({ meta: [{ title: "Subscription — CognifyAI" }] }),
  component: Subscription,
});

const plans = [
  { name: "Free", price: "$0", period: "/mo", feats: ["3 skill assessments", "Basic AI assistant", "Community support"], current: false, accent: "bg-card" },
  { name: "Pro", price: "$19", period: "/mo", feats: ["Unlimited assessments", "Full AI assistant", "Career predictions", "Priority support"], current: true, accent: "bg-gradient-primary" },
  { name: "Enterprise", price: "$49", period: "/mo", feats: ["Everything in Pro", "Team analytics", "1:1 mentorship", "API access"], current: false, accent: "bg-card" },
];

function Subscription() {
  return (
    <AppShell>
      <PageHeader title="Subscription" back="/profile" />
      <div className="space-y-4">
        {plans.map((p) => {
          const isPro = p.current;
          return (
            <div key={p.name} className={`rounded-3xl p-6 ${p.accent} ${isPro ? "text-white shadow-glow" : "shadow-card"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isPro && <Sparkles className="h-4 w-4" />}
                    <p className={`text-xs uppercase tracking-wider ${isPro ? "text-white/80" : "text-muted-foreground"}`}>{p.name}</p>
                  </div>
                  <p className="text-3xl font-bold mt-2">{p.price}<span className={`text-base ${isPro ? "text-white/70" : "text-muted-foreground"}`}>{p.period}</span></p>
                </div>
                {isPro && <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">Current</span>}
              </div>
              <ul className="mt-4 space-y-2">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 ${isPro ? "text-white" : "text-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-5 w-full py-3 rounded-2xl font-bold ${
                  isPro ? "bg-white/20 text-white" : "bg-gradient-primary text-white shadow-glow"
                }`}
              >
                {isPro ? "Manage Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
