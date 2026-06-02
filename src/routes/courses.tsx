import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Filter, BookOpen, Star, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/courses")({
  head: () => ({ meta: [{ title: "Course Catalog — CognifyAI" }] }),
  component: Courses,
});

const cats = ["All Courses", "Data Science", "Programming", "AI/ML", "Design"];

function Courses() {
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All Courses");

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await api.getCourses();
        setCoursesList(data);
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const filteredCourses = coursesList.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.author.toLowerCase().includes(search.toLowerCase());
    
    if (activeCat === "All Courses") return matchesSearch;
    return matchesSearch && c.tags && c.tags.some((t: string) => t.toLowerCase().includes(activeCat.toLowerCase().split("/")[0]));
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
          <p className="text-3xl font-bold">{loading ? "..." : coursesList.length}</p>
          <p className="text-sm text-white/80">courses available</p>
        </div>
        <BookOpen className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-bold mt-6 mb-3">Popular Categories</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`shrink-0 px-5 h-11 rounded-2xl font-semibold text-sm transition-all border-0 cursor-pointer ${
              c === activeCat ? "bg-gradient-primary text-white shadow-glow" : "bg-card shadow-card"
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
            filteredCourses.map((c) => (
              <Link to="/courses" key={c.title || c._id} className="block p-4 rounded-2xl bg-card shadow-card border border-border/10">
                <div className="flex gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shrink-0">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-foreground">{c.title}</p>
                    <p className="text-sm text-muted-foreground">{c.author}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(c.tags || []).map((t: string, i: number) => (
                        <span
                          key={t}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{
                            backgroundColor: i === 0 ? "oklch(0.62 0.21 260 / 0.12)" : "oklch(0.55 0.24 280 / 0.12)",
                            color: i === 0 ? "oklch(0.5 0.21 260)" : "oklch(0.45 0.24 280)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.weeks} weeks</span>
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{c.rating} ({c.students})</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No courses found matching criteria.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
