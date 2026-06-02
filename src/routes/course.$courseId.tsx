import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, BookOpen, Star, Users, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/course/$courseId")({
  head: () => ({ meta: [{ title: "Course Details — CognifyAI" }] }),
  component: CourseDetails,
});

const lessons = [
  { id: "l1", title: "Introduction & Setup", duration: "12 min", done: true },
  { id: "l2", title: "Core Concepts", duration: "24 min", done: true },
  { id: "l3", title: "Hands-on Practice", duration: "32 min", done: false },
  { id: "l4", title: "Advanced Patterns", duration: "28 min", done: false },
  { id: "l5", title: "Final Project", duration: "45 min", done: false },
];

function CourseDetails() {
  return (
    <AppShell>
      <PageHeader title="Course Details" back="/learning/my-courses" />
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <p className="text-xs text-white/80 uppercase tracking-wider">Featured Course</p>
        <h2 className="text-2xl font-bold mt-2">Machine Learning Foundations</h2>
        <p className="text-sm text-white/80 mt-2">Master the essentials of ML with hands-on projects.</p>
        <div className="grid grid-cols-3 gap-3 mt-5 text-center">
          <div><Clock className="h-4 w-4 mx-auto mb-1" /><p className="text-xs">8 hrs</p></div>
          <div><BookOpen className="h-4 w-4 mx-auto mb-1" /><p className="text-xs">24 lessons</p></div>
          <div><Star className="h-4 w-4 mx-auto mb-1" /><p className="text-xs">4.9 rating</p></div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <div className="h-11 w-11 rounded-full bg-gradient-pink" />
        <div className="flex-1">
          <p className="font-bold">Dr. Amara Chen</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> 12,480 students</p>
        </div>
      </div>

      <h3 className="text-lg font-bold mt-6 mb-3">Lessons</h3>
      <div className="space-y-2">
        {lessons.map((l, i) => (
          <Link
            key={l.id}
            to="/lesson/$lessonId"
            params={{ lessonId: l.id }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card shadow-card"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${l.done ? "bg-gradient-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {l.done ? <PlayCircle className="h-5 w-5" /> : <span className="text-sm font-bold">{i + 1}</span>}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{l.title}</p>
              <p className="text-xs text-muted-foreground">{l.duration}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link
        to="/lesson/$lessonId"
        params={{ lessonId: "l3" }}
        className="block mt-6 py-4 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow"
      >
        Continue Learning
      </Link>
    </AppShell>
  );
}
