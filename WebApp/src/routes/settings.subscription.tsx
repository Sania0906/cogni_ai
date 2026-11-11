import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Sparkles, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/settings/subscription")({
  head: () => ({ meta: [{ title: "Subscription — CognifyAI" }] }),
  component: Subscription,
});

const defaultPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    feats: ["3 skill assessments", "Basic ATS scoring", "Community access"],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    feats: [
      "Unlimited ML ATS assessments",
      "Full Career Twin trajectory engine",
      "Automated skill gap roadmaps",
      "Priority recruiter indexing",
    ],
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/mo",
    feats: [
      "Everything in Pro",
      "Team analytics & recruitment pipeline",
      "1:1 Executive career mentorship",
      "Full REST API programmatic access",
    ],
  },
];

function Subscription() {
  const [currentPlan, setCurrentPlan] = useState("Pro");
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSub() {
      try {
        setLoading(true);
        const data = await api.getSubscription();
        if (data?.plan) {
          setCurrentPlan(data.plan);
        }
      } catch (err) {
        console.error("Failed to load subscription", err);
      } finally {
        setLoading(false);
      }
    }
    loadSub();
  }, []);

  const handleSelectPlan = async (planName: string) => {
    if (planName === currentPlan) return;
    try {
      setUpgradingPlan(planName);
      const res = await api.upgradeSubscription(planName);
      setCurrentPlan(res.plan || planName);
      setSuccessMsg(`Successfully updated to ${planName} Plan!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to update subscription", err);
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Subscription" back="/profile" />

      <div className="mb-4 p-3 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground">
        <strong>Subscription Tier Mode:</strong> Plan upgrades persist directly in the database. External payment card processing (Stripe/Razorpay) is not enabled in local evaluation mode.
      </div>

      {successMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-success/20 text-success text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {defaultPlans.map((p) => {
            const isCurrent = currentPlan.toLowerCase() === p.name.toLowerCase();
            const isUpgrading = upgradingPlan === p.name;

            return (
              <div
                key={p.name}
                className={`rounded-3xl p-6 transition-all ${
                  isCurrent
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "bg-card shadow-card text-foreground"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {isCurrent && <Sparkles className="h-4 w-4" />}
                      <p
                        className={`text-xs uppercase tracking-wider font-semibold ${
                          isCurrent ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        {p.name}
                      </p>
                    </div>
                    <p className="text-3xl font-bold mt-2">
                      {p.price}
                      <span
                        className={`text-base font-normal ${
                          isCurrent ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        {p.period}
                      </span>
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
                      Current Plan
                    </span>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 ${isCurrent ? "text-white" : "text-primary"}`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(p.name)}
                  disabled={isCurrent || isUpgrading}
                  className={`mt-5 w-full py-3.5 rounded-2xl font-bold text-sm border-0 transition-all ${
                    isCurrent
                      ? "bg-white/20 text-white cursor-default"
                      : "bg-gradient-primary text-white shadow-glow cursor-pointer hover:opacity-95 disabled:opacity-50"
                  }`}
                >
                  {isUpgrading
                    ? "Updating Plan..."
                    : isCurrent
                      ? "Active Plan ✓"
                      : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
