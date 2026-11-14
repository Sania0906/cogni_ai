import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Filter, BookOpen, Star, Clock, PlayCircle, Award, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/courses")({
  head: () => ({ meta: [{ title: "Courses — CognifyAI" }] }),
  component: Courses,
});

const cats = ["All Courses", "In Progress", "Data Science", "Programming", "AI/ML", "Design"];

function Courses() {
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All Courses");

  const loadData = async () => {
    try {
      const [catalog, enrolled] = await Promise.all([
        api.getCourses().catch(() => []),
        api.getMyCourses().catch(() => []),
      ]);
      setCoursesList(catalog || []);
      setEnrolledCourses(enrolled || []);
    } catch (err) {
      console.error("Failed to load courses data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(loadData, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const enrolledIdMap = new Map<string, any>();
  enrolledCourses.forEach((e) => {
    const id = e.id || e.courseId;
    if (id) enrolledIdMap.set(id, e);
  });

  const filteredCourses = coursesList.filter((c) => {
    const courseId = c._id || c.id;
    const isEnrolled = enrolledIdMap.has(courseId);

    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCat === "All Courses") return true;
    if (activeCat === "In Progress") return isEnrolled;
    return (
      c.tags &&
      c.tags.some((t: string) =>
        t.toLowerCase().includes(activeCat.toLowerCase().split("/")[0]),
      )
    );
  });

  return (
    <AppShell>
      <PageHeader title="Course Catalog" back="/career" />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 rounded-2xl bg-card shadow-card pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
          />
        </div>
        <button className="h-14 w-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center shadow-glow border-0">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 rounded-3xl p-5 bg-gradient-primary text-white shadow-glow flex justify-between items-center">
        <div>
          <p className="text-3xl font-bold">
            {loading ? "..." : coursesList.length}
          </p>
          <p className="text-sm text-white/80">courses available</p>
        </div>
        <BookOpen className="h-7 w-7" />
      </div>

      {/* Enrolled Courses / Continue Learning Banner */}
      {enrolledCourses.length > 0 && (
        <div className="mt-7">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Continue Learning</h2>
            <span className="text-xs text-muted-foreground font-semibold">
              {enrolledCourses.length} Enrolled
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {enrolledCourses.map((ec) => {
              const courseId = ec.id || ec.courseId;
              return (
                <div
                  key={courseId}
                  className="p-5 rounded-2xl bg-card shadow-card border border-primary/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        In Progress
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {ec.progress || 0}%
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-foreground mt-1 line-clamp-1">
                      {ec.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ec.instructor || "Expert Instructor"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary rounded-full transition-all duration-300"
                        style={{ width: `${ec.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1.5 mb-3">
                      <span>
                        {ec.completedLessons || 0} of {ec.totalLessons || 6} lessons
                      </span>
                      <span>{ec.lastAccessed || "Recently"}</span>
                    </div>

                    <Link
                      to="/course/$courseId"
                      params={{ courseId }}
                      className="block w-full py-2.5 text-center text-xs font-bold rounded-xl bg-gradient-primary text-white shadow-glow hover:opacity-95"
                    >
                      Continue Learning →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mt-7 mb-3">Popular Categories</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`shrink-0 px-5 h-11 rounded-2xl font-semibold text-sm transition-all border-0 cursor-pointer ${
              c === activeCat
                ? "bg-gradient-primary text-white shadow-glow"
                : "bg-card shadow-card"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <h2 className="text-lg font-bold mt-7 mb-3">Featured Courses</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((c) => {
              const courseId = c._id || c.id;
              const enrolled = enrolledIdMap.get(courseId);
              return (
                <Link
                  to="/course/$courseId"
                  params={{ courseId }}
                  key={c.title || courseId}
                  className="block p-4 rounded-2xl bg-card shadow-card border border-border/10 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shrink-0">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold truncate text-foreground text-base">
                          {c.title}
                        </p>
                        {enrolled && (
                          <span className="shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {enrolled.progress || 0}% Done
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.author}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(c.tags || []).map((t: string, i: number) => (
                          <span
                            key={t}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{
                              backgroundColor:
                                i === 0
                                  ? "oklch(0.62 0.21 260 / 0.12)"
                                  : "oklch(0.55 0.24 280 / 0.12)",
                              color:
                                i === 0
                                  ? "oklch(0.5 0.21 260)"
                                  : "oklch(0.45 0.24 280)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {enrolled && (
                        <div className="mt-2.5">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-primary rounded-full"
                              style={{ width: `${enrolled.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {c.weeks} weeks
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" />
                          {c.rating} ({c.students})
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No courses found matching criteria.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
