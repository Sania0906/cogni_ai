import { createFileRoute } from "@tanstack/react-router";
import { Search, MoreVertical } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Management — CognifyAI" }] }),
  component: UsersAdmin,
});

const users = [
  { name: "Alex Morgan", email: "alex@cognify.ai", role: "Pro", status: "Active" },
  { name: "Priya Shah", email: "priya@cognify.ai", role: "Admin", status: "Active" },
  { name: "Marco Reyes", email: "marco@cognify.ai", role: "Free", status: "Active" },
  { name: "Lin Park", email: "lin@cognify.ai", role: "Pro", status: "Suspended" },
  { name: "Jordan Lee", email: "jordan@cognify.ai", role: "Free", status: "Active" },
  { name: "Amara Chen", email: "amara@cognify.ai", role: "Pro", status: "Pending" },
];

const statusColor = {
  Active: "bg-success/20 text-success",
  Suspended: "bg-destructive/20 text-destructive",
  Pending: "bg-warning/20 text-warning",
} as const;

function UsersAdmin() {
  return (
    <AdminShell title="Users">
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search users..."
          className="w-full h-12 rounded-2xl bg-card shadow-card pl-11 pr-4 text-sm outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl bg-card shadow-card p-3 text-center"><p className="text-xl font-bold">24.8k</p><p className="text-xs text-muted-foreground">Total</p></div>
        <div className="rounded-2xl bg-card shadow-card p-3 text-center"><p className="text-xl font-bold">3.2k</p><p className="text-xs text-muted-foreground">Pro</p></div>
        <div className="rounded-2xl bg-card shadow-card p-3 text-center"><p className="text-xl font-bold">142</p><p className="text-xs text-muted-foreground">New</p></div>
      </div>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {users.map((u, i) => (
          <div key={u.email} className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="h-10 w-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-sm">
              {u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[u.status as keyof typeof statusColor]}`}>{u.status}</span>
            <button><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
