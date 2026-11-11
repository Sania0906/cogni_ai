import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Clock, BookOpen, Star, Users, PlayCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/course/$courseId")({
  head: () => ({ meta: [{ title: "Course Details — CognifyAI" }] }),
  component: CourseDetails,
});

function CourseDetails() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        const data = await api.getCourseById(courseId);
        setCourse(data);
      } catch (err: any) {
        setError(err.message || "Failed to load course details.");
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      const res = await api.enrollCourse(courseId);
      setCourse((prev: any) => ({
        ...prev,
        isEnrolled: true,
        progress: res.progress || 0,
      }));
    } catch (err: any) {
      console.error("Enrollment failed:", err);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Course Details" back="/courses" />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !course) {
    return (
      <AppShell>
        <PageHeader title="Course Details" back="/courses" />
        <div className="rounded-3xl p-8 bg-card shadow-card text-center mt-6">
          <p className="text-destructive font-bold text-lg mb-2">Course Not Found</p>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "The requested curriculum could not be retrieved from the database."}
          </p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-primary text-white font-bold shadow-glow text-sm"
          >
            Explore Catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const nextLessonId = course.nextLessonId || (lessons[0]?.id || "l1");

  return (
    <AppShell>
      <PageHeader title="Course Details" back="/courses" />

      {/* Featured Header Card */}
      <div className="rounded-3xl p-6 bg-gradient-primary text-white shadow-glow">
        <div className="flex justify-between items-start">
          <p className="text-xs text-white/80 uppercase tracking-wider font-semibold">
            {course.tags?.[0] || "Specialized Curriculum"}
          </p>
          {course.isEnrolled && (
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
              Enrolled ({course.progress}%)
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold mt-2">{course.title}</h2>
        <p className="text-sm text-white/80 mt-2 leading-relaxed">
          {course.description || "Master industry-standard practices with structured exercises, deep dives, and hands-on projects."}
        </p>

        {course.isEnrolled && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Overall Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-5 text-center pt-3 border-t border-white/15">
          <div>
            <Clock className="h-4 w-4 mx-auto mb-1 text-white/90" />
            <p className="text-xs font-semibold">{course.weeks} weeks</p>
          </div>
          <div>
            <BookOpen className="h-4 w-4 mx-auto mb-1 text-white/90" />
            <p className="text-xs font-semibold">{lessons.length} lessons</p>
          </div>
          <div>
            <Star className="h-4 w-4 mx-auto mb-1 text-white/90" />
            <p className="text-xs font-semibold">{course.rating} rating</p>
          </div>
        </div>
      </div>

      {/* Instructor Information */}
      <div className="flex items-center gap-3 mt-5 p-4 rounded-2xl bg-card shadow-card">
        <div className="h-12 w-12 rounded-2xl bg-gradient-pink text-white flex items-center justify-center font-bold text-lg">
          {(course.author || "Dr. Amara Chen")[0]}
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">{course.author || "Dr. Amara Chen"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Users className="h-3.5 w-3.5 text-primary" /> {course.students || "10k+"} enrolled students
          </p>
        </div>
      </div>

      {/* Curriculum Lessons List */}
      <h3 className="text-lg font-bold mt-6 mb-3">Curriculum Lessons</h3>
      <div className="space-y-2">
        {lessons.map((l: any, i: number) => (
          <Link
            key={l.id}
            to="/lesson/$lessonId"
            params={{ lessonId: l.id }}
            search={{ courseId }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-card shadow-card hover:bg-card/90 transition-all"
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                l.done
                  ? "bg-gradient-primary text-white shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {l.done ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-foreground">{l.title}</p>
              <p className="text-xs text-muted-foreground">{l.duration}</p>
            </div>
            <PlayCircle className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Action CTA */}
      <div className="mt-6">
        {course.isEnrolled ? (
          <Link
            to="/lesson/$lessonId"
            params={{ lessonId: nextLessonId }}
            search={{ courseId }}
            className="block w-full py-4 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow hover:opacity-95"
          >
            Continue Learning
          </Link>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="w-full py-4 text-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow border-0 cursor-pointer hover:opacity-95 disabled:opacity-50"
          >
            {isEnrolling ? "Enrolling..." : "Enroll in Course"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
