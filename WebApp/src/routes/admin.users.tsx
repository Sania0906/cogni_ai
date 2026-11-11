import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Management — CognifyAI" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users for admin panel", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setDeletingId(id);
      await api.deleteAdminUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminShell title="Users">
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full h-12 rounded-2xl bg-card shadow-card pl-11 pr-4 text-sm outline-none border border-border/40 focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl bg-card shadow-card p-3 text-center border border-border/10">
          <p className="text-xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total Registered</p>
        </div>
        <div className="rounded-2xl bg-card shadow-card p-3 text-center border border-border/10">
          <p className="text-xl font-bold">
            {users.filter((u) => u.role === "admin").length}
          </p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
        <div className="rounded-2xl bg-card shadow-card p-3 text-center border border-border/10">
          <p className="text-xl font-bold">
            {users.filter((u) => u.role === "user").length}
          </p>
          <p className="text-xs text-muted-foreground">Standard Users</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-card shadow-card overflow-hidden border border-border/10">
          {filteredUsers.length === 0 ? (
            <p className="text-xs text-center py-8 text-muted-foreground">
              No users found.
            </p>
          ) : (
            filteredUsers.map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-3.5 ${
                  i > 0 ? "border-t border-border/40" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-sm">
                  {u.name ? u.name[0].toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.email}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    u.role === "admin"
                      ? "bg-primary/20 text-primary"
                      : "bg-emerald-500/20 text-emerald-600"
                  }`}
                >
                  {u.role || "user"}
                </span>
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </AdminShell>
  );
}
