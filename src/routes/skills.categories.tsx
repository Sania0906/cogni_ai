import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, Brain, BarChart3, Database, Palette, Briefcase, Languages, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/skills/categories")({
  head: () => ({ meta: [{ title: "Skill Categories — CognifyAI" }] }),
  component: Categories,
});

const cats = [
  { name: "Programming", count: 124, icon: Code2, color: "bg-gradient-blue" },
  { name: "AI & ML", count: 87, icon: Brain, color: "bg-gradient-primary" },
  { name: "Data Science", count: 65, icon: BarChart3, color: "bg-gradient-pink" },
  { name: "Databases", count: 42, icon: Database, color: "bg-gradient-blue" },
  { name: "Design", count: 58, icon: Palette, color: "bg-gradient-pink" },
  { name: "Business", count: 33, icon: Briefcase, color: "bg-gradient-primary" },
  { name: "Languages", count: 24, icon: Languages, color: "bg-gradient-blue" },
  { name: "DevOps", count: 38, icon: Wrench, color: "bg-gradient-primary" },
];

function Categories() {
  return (
    <AppShell>
      <PageHeader title="Categories" back="/skills" />
      <p className="text-sm text-muted-foreground -mt-3 mb-5">Explore skills by domain</p>
      <div className="grid grid-cols-2 gap-3">
        {cats.map((c) => (
          <Link
            key={c.name}
            to="/skills"
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <div className={`h-12 w-12 rounded-2xl ${c.color} flex items-center justify-center text-white mb-3`}>
              <c.icon className="h-6 w-6" />
            </div>
            <p className="font-bold">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.count} skills</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
