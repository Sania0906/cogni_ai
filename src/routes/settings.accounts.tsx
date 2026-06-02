import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/accounts")({
  head: () => ({ meta: [{ title: "Connected Accounts — CognifyAI" }] }),
  component: Accounts,
});

const accounts = [
  { name: "Google", desc: "alex@gmail.com", color: "bg-gradient-pink", connected: true },
  { name: "GitHub", desc: "@alexcodes", color: "bg-gradient-primary", connected: true },
  { name: "LinkedIn", desc: "Connect for insights", color: "bg-gradient-blue", connected: false },
  { name: "Apple", desc: "Sign in with Apple", color: "bg-gradient-primary", connected: false },
  { name: "Slack", desc: "Team notifications", color: "bg-gradient-pink", connected: false },
];

function Accounts() {
  return (
    <AppShell>
      <PageHeader title="Connected Accounts" back="/profile" />
      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.name} className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card">
            <div className={`h-12 w-12 rounded-2xl ${a.color} text-white flex items-center justify-center font-bold`}>
              {a.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <button
              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                a.connected ? "bg-muted text-foreground" : "bg-gradient-primary text-white shadow-glow"
              }`}
            >
              {a.connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
