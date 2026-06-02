import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/skills/add")({
  head: () => ({ meta: [{ title: "Add Skill — CognifyAI" }] }),
  component: AddSkill,
});

function AddSkill() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Programming");
  const [level, setLevel] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Skill name is required");
      return;
    }

    setLoading(true);
    try {
      const proficiency = level >= 85 ? "Advanced" : level >= 60 ? "Intermediate" : "Beginner";
      await api.addSkill({
        name: name.trim(),
        category,
        level: proficiency,
        progress: level
      });
      toast.success("Skill added successfully!");
      navigate({ to: "/skills" });
    } catch (err: any) {
      toast.error(err.message || "Failed to add skill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Add New Skill" back="/skills" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold mb-2 block">Skill name</label>
          <input
            className="w-full h-14 rounded-2xl bg-card shadow-card px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            placeholder="e.g. React, GraphQL"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Category</label>
          <select 
            className="w-full h-14 rounded-2xl bg-card shadow-card px-4 focus:outline-none text-foreground"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
          >
            <option value="Programming">Programming</option>
            <option value="Data Science">Data Science</option>
            <option value="Design">Design</option>
            <option value="Soft Skills">Soft Skills</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Proficiency · {level}%</label>
          <input
            type="range"
            min={0}
            max={100}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full accent-[oklch(0.55_0.24_280)]"
            disabled={loading}
          />
        </div>
        <button 
          type="submit"
          className="w-full h-14 mt-4 rounded-2xl bg-gradient-primary text-white font-bold shadow-glow flex items-center justify-center disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Skill"}
        </button>
      </form>
    </AppShell>
  );
}
