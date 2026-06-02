import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/language")({
  head: () => ({ meta: [{ title: "Language — CognifyAI" }] }),
  component: Language,
});

const langs = [
  { code: "en", name: "English", region: "United States" },
  { code: "es", name: "Español", region: "España" },
  { code: "fr", name: "Français", region: "France" },
  { code: "de", name: "Deutsch", region: "Deutschland" },
  { code: "ja", name: "日本語", region: "Japan" },
  { code: "zh", name: "中文", region: "中国" },
  { code: "ar", name: "العربية", region: "Saudi Arabia" },
  { code: "hi", name: "हिन्दी", region: "India" },
];

function Language() {
  return (
    <AppShell>
      <PageHeader title="Language" back="/profile" />
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {langs.map((l, i) => (
          <button
            key={l.code}
            className={`w-full flex items-center gap-4 p-4 text-left ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-primary text-white flex items-center justify-center font-bold text-sm uppercase">
              {l.code}
            </div>
            <div className="flex-1">
              <p className="font-bold">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.region}</p>
            </div>
            {i === 0 && (
              <div className="h-6 w-6 rounded-full bg-gradient-primary text-white flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        ))}
      </div>
    </AppShell>
  );
}
