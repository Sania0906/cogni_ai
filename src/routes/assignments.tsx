import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Assignments — CognifyAI" }] }),
  component: Assignments,
});

const items = [
  { title: "Build a Linear Regression Model", course: "ML Foundations", due: "in 2 days", status: "pending" },
  { title: "Data Cleaning Exercise", course: "Python Pro", due: "in 5 days", status: "pending" },
  { title: "Dashboard Project", course: "Data Viz", due: "Submitted", status: "done" },
  { title: "SQL Query Challenge", course: "SQL Deep Dive", due: "Overdue", status: "late" },
];

const map = {
  pending: { Icon: Clock, bg: "bg-gradient-blue" },
  done: { Icon: FileCheck2, bg: "bg-gradient-primary" },
  late: { Icon: AlertCircle, bg: "bg-gradient-pink" },
} as const;

function Assignments() {
  return (
    <AppShell>
      <PageHeader title="Assignments" back="/courses" />
      <div className="space-y-3">
        {items.map((a) => {
          const { Icon, bg } = map[a.status as keyof typeof map];
          return (
            <div key={a.title} className="flex gap-3 p-4 rounded-2xl bg-card shadow-card">
              <div className={`h-12 w-12 rounded-2xl ${bg} text-white flex items-center justify-center shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.course}</p>
                <p className="text-xs mt-1 font-medium">{a.due}</p>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
