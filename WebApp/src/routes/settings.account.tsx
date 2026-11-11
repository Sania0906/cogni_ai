import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Lock, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/settings/account")({
  head: () => ({ meta: [{ title: "Account Settings — CognifyAI" }] }),
  component: Account,
});

const items = [
  {
    icon: User,
    t: "Personal Information",
    d: "Update your profile details and title",
    color: "bg-gradient-blue",
    link: "/profile",
  },
  {
    icon: Mail,
    t: "Email Preferences",
    d: "Manage communication and job notifications",
    color: "bg-gradient-pink",
    link: "/notifications",
  },
  {
    icon: Lock,
    t: "Security & Credentials",
    d: "Update password and authentication sessions",
    color: "bg-gradient-primary",
    link: "/reset-password",
  },
];

function Account() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await api.deleteAccount();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate({ to: "/login" });
    } catch (err: any) {
      setError(err.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Account Settings" back="/profile" />

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {items.map((it, i) => (
          <Link
            key={it.t}
            to={it.link}
            className={`flex items-center gap-4 p-4 hover:bg-card/80 transition-all ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div
              className={`h-11 w-11 rounded-xl ${it.color} flex items-center justify-center text-white shrink-0`}
            >
              <it.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">{it.t}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{it.d}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        className="w-full mt-5 flex items-center gap-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all cursor-pointer text-left"
      >
        <div className="h-11 w-11 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-destructive">Delete Account</p>
          <p className="text-xs text-destructive/80">
            Permanently remove your profile, resumes, and stored data
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-destructive" />
      </button>

      {/* Confirmation Dialog Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-destructive/20 text-center animate-in fade-in zoom-in-95">
            <div className="h-14 w-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Delete Account?</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to permanently delete your CognifyAI account? This will erase all your ATS analyses, bookmarks, and certifications.
            </p>

            {error && (
              <p className="text-xs text-destructive mt-3 bg-destructive/10 p-2 rounded-xl">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="py-3 rounded-xl bg-muted text-foreground text-sm font-semibold border-0 cursor-pointer hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold border-0 cursor-pointer hover:opacity-95 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
