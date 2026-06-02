import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/learning/my-courses")({
  head: () => ({ meta: [{ title: "My Courses — CognifyAI" }] }),
  component: MyCourses,
});

const courses = [
  { id: "ml-foundations", title: "Machine Learning Foundations", progress: 72, instructor: "Dr. Amara Chen" },
  { id: "python-pro", title: "Python Pro Patterns", progress: 45, instructor: "Marco Reyes" },
  { id: "data-viz", title: "Data Visualization Mastery", progress: 90, instructor: "Priya Shah" },
  { id: "sql-deep", title: "SQL Deep Dive", progress: 22, instructor: "Lin Park" },
];

function MyCourses() {
  return (
    <AppShell>
      <PageHeader title="My Courses" back="/courses" />
      <div className="flex gap-2 mb-5">
        {["In Progress", "Completed", "Saved"].map((t, i) => (
          <button
            key={t}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              i === 0 ? "bg-gradient-primary text-white shadow-glow" : "bg-card text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {courses.map((c) => (
          <Link
            key={c.id}
            to="/course/$courseId"
            params={{ courseId: c.id }}
            className="block p-4 rounded-2xl bg-card shadow-card"
          >
            <div className="flex gap-3 mb-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white">
                <PlayCircle className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.instructor}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{c.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${c.progress}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
