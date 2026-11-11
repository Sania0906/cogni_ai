import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/settings/accounts")({
  head: () => ({ meta: [{ title: "Connected Accounts — CognifyAI" }] }),
  component: Accounts,
});

const fallbackAccounts = [
  {
    name: "Google",
    desc: "alex@gmail.com",
    color: "bg-gradient-pink",
    connected: true,
  },
  {
    name: "GitHub",
    desc: "@alexcodes",
    color: "bg-gradient-primary",
    connected: true,
  },
  {
    name: "LinkedIn",
    desc: "Connect for insights",
    color: "bg-gradient-blue",
    connected: false,
  },
  {
    name: "Apple",
    desc: "Sign in with Apple",
    color: "bg-gradient-primary",
    connected: false,
  },
  {
    name: "Slack",
    desc: "Team notifications",
    color: "bg-gradient-pink",
    connected: false,
  },
];

function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingName, setTogglingName] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true);
        const data = await api.getConnectedAccounts();
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
        } else {
          setAccounts(fallbackAccounts);
        }
      } catch (err) {
        console.error("Failed to load connected accounts", err);
        setAccounts(fallbackAccounts);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  const handleToggle = async (provider: string) => {
    try {
      setTogglingName(provider);
      const updated = await api.toggleConnectedAccount(provider);
      if (Array.isArray(updated)) {
        setAccounts(updated);
      } else {
        setAccounts((prev) =>
          prev.map((a) => (a.name === provider ? { ...a, connected: !a.connected } : a))
        );
      }
    } catch (err) {
      console.error("Failed to toggle provider connection", err);
    } finally {
      setTogglingName(null);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Connected Accounts" back="/profile" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const isToggling = togglingName === a.name;

            return (
              <div
                key={a.name}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card border border-border/10"
              >
                <div
                  className={`h-12 w-12 rounded-2xl ${a.color || "bg-gradient-primary"} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm`}
                >
                  {a.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(a.name)}
                  disabled={isToggling}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
                    a.connected
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "bg-gradient-primary text-white shadow-glow hover:opacity-95"
                  } disabled:opacity-50`}
                >
                  {isToggling ? "Updating..." : a.connected ? "Disconnect" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
