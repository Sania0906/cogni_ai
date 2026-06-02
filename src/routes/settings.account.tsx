import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Mail, Lock, Trash2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/settings/account")({
  head: () => ({ meta: [{ title: "Account Settings — CognifyAI" }] }),
  component: Account,
});

const items = [
  { icon: User, t: "Personal Information", d: "Update your details", color: "bg-gradient-blue" },
  { icon: Mail, t: "Email Preferences", d: "Manage email notifications", color: "bg-gradient-pink" },
  { icon: Lock, t: "Change Password", d: "Update security credentials", color: "bg-gradient-primary" },
];

function Account() {
  return (
    <AppShell>
      <PageHeader title="Account Settings" back="/profile" />

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {items.map((it, i) => (
          <Link
            key={it.t}
            to="/profile"
            className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className={`h-11 w-11 rounded-xl ${it.color} flex items-center justify-center text-white`}>
              <it.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">{it.t}</p>
              <p className="text-xs text-muted-foreground">{it.d}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button className="w-full mt-5 flex items-center gap-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
        <div className="h-11 w-11 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-destructive">Delete Account</p>
          <p className="text-xs text-destructive/80">Permanently remove your account</p>
        </div>
        <ChevronRight className="h-5 w-5 text-destructive" />
      </button>
    </AppShell>
  );
}
