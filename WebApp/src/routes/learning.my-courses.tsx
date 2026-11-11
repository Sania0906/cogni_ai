import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PlayCircle, CheckCircle2, BookOpen, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/learning/my-courses")({
  head: () => ({ meta: [{ title: "My Courses — CognifyAI" }] }),
  component: MyCourses,
});

function MyCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("In Progress");

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await api.getMyCourses();
        if (data && data.length > 0) {
          setCourses(data);
        } else {
          // If user hasn't enrolled yet, show initial learning track
          setCourses([
            {
              id: "course_1",
              courseId: "course_1",
              title: "Machine Learning Foundations",
              instructor: "Dr. Amara Chen",
              progress: 45,
              completedLessons: 3,
              totalLessons: 6,
            },
            {
              id: "course_2",
              courseId: "course_2",
              title: "Python Pro Patterns",
              instructor: "Marco Reyes",
              progress: 100,
              completedLessons: 6,
              totalLessons: 6,
            },
            {
              id: "course_3",
              courseId: "course_3",
              title: "Data Visualization Mastery",
              instructor: "Priya Shah",
              progress: 20,
              completedLessons: 1,
              totalLessons: 5,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load user courses", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const filteredCourses = courses.filter((c) => {
    if (activeTab === "In Progress") return c.progress < 100;
    if (activeTab === "Completed") return c.progress >= 100;
    return true; // "Saved" / All
  });

  return (
    <AppShell>
      <PageHeader title="My Courses" back="/courses" />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {["In Progress", "Completed", "Saved"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer ${
              t === activeTab
                ? "bg-gradient-primary text-white shadow-glow"
                : "bg-card text-muted-foreground hover:bg-card/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="space-y-3">
          {filteredCourses.map((c) => (
            <Link
              key={c.id || c.courseId}
              to="/course/$courseId"
              params={{ courseId: c.courseId || c.id }}
              className="block p-4 rounded-2xl bg-card shadow-card hover:bg-card/90 transition-all border border-border/10"
            >
              <div className="flex gap-3 mb-3">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                    c.progress >= 100 ? "bg-success" : "bg-gradient-primary shadow-glow"
                  }`}
                >
                  {c.progress >= 100 ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : (
                    <PlayCircle className="h-7 w-7" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.instructor}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {c.completedLessons || 0} of {c.totalLessons || 6} lessons completed
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold text-foreground">{c.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    c.progress >= 100 ? "bg-success" : "bg-gradient-primary"
                  }`}
                  style={{ width: `${c.progress}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl p-8 bg-card shadow-card text-center my-6">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-foreground">No courses in {activeTab}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Explore our curriculum catalog to enroll in top technology and AI courses.
          </p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-white font-bold text-xs shadow-glow"
          >
            Browse Course Catalog <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </AppShell>
  );
}
