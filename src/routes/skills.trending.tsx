import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/skills/trending")({
  head: () => ({ meta: [{ title: "Trending Skills — CognifyAI" }] }),
  component: Trending,
});

const trends = [
  { name: "Generative AI", growth: "+184%", demand: "Very High" },
  { name: "Prompt Engineering", growth: "+162%", demand: "Very High" },
  { name: "LLM Fine-tuning", growth: "+128%", demand: "High" },
  { name: "Vector Databases", growth: "+96%", demand: "High" },
  { name: "Rust", growth: "+78%", demand: "High" },
  { name: "Edge AI", growth: "+64%", demand: "Growing" },
];

function Trending() {
  return (
    <AppShell>
      <PageHeader title="Trending Skills" back="/skills" />
      <div className="rounded-3xl p-6 bg-gradient-pink text-white shadow-glow mb-5">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          <p className="text-sm">Hot this month</p>
        </div>
        <p className="text-2xl font-bold mt-2">Skills employers want now</p>
      </div>
      <div className="space-y-3">
        {trends.map((t, i) => (
          <Link
            key={t.name}
            to="/skills/$skillId"
            params={{ skillId: t.name.toLowerCase().replace(/\s+/g, "-") }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-primary text-white flex items-center justify-center font-bold">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold">{t.name}</p>
              <p className="text-xs text-muted-foreground">Demand: {t.demand}</p>
            </div>
            <div className="flex items-center gap-1 text-success font-semibold text-sm">
              <TrendingUp className="h-4 w-4" />
              {t.growth}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
