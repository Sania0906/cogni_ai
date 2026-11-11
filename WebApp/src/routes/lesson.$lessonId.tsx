import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Play, Pause, ArrowLeft, SkipForward, SkipBack, FileText, CheckCircle2, Download } from "lucide-react";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/lesson/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson — CognifyAI" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: typeof search.courseId === "string" ? search.courseId : "course_1",
  }),
  component: Lesson,
});

function Lesson() {
  const { lessonId } = Route.useParams();
  const search = Route.useSearch();
  const courseId = search?.courseId || "course_1";
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSec, setProgressSec] = useState(120);
  const [totalSec] = useState(720); // 12 min
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    async function fetchLesson() {
      try {
        setLoading(true);
        const data = await api.getLessonById(lessonId, courseId);
        setLesson(data);
        setIsCompleted(Boolean(data?.isDone));
      } catch (err) {
        console.error("Failed to load lesson:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLesson();
  }, [lessonId, courseId]);

  // Video playback simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          if (prev >= totalSec) {
            setIsPlaying(false);
            return totalSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSec]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (progressSec > 15) {
      setProgressSec((prev) => prev - 15);
    } else if (lesson?.prevLessonId) {
      navigate({ to: "/lesson/$lessonId", params: { lessonId: lesson.prevLessonId }, search: { courseId } });
    }
  };

  const handleSkipForward = () => {
    if (progressSec < totalSec - 15) {
      setProgressSec((prev) => prev + 15);
    } else if (lesson?.nextLessonId) {
      navigate({ to: "/lesson/$lessonId", params: { lessonId: lesson.nextLessonId }, search: { courseId } });
    }
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      await api.completeLesson(lessonId, courseId);
      setIsCompleted(true);
    } catch (err) {
      console.error("Failed to complete lesson:", err);
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const lessonTitle = lesson?.title || "Lesson Overview";
  const lessonSummary = lesson?.summary || "Hands-on implementation of core theoretical concepts and software patterns.";
  const resources = Array.isArray(lesson?.resources)
    ? lesson.resources
    : ["Lesson Guide (PDF)", "Starter Code (.ts)", "Slides & Architecture"];

  return (
    <div className="mx-auto max-w-md min-h-screen pb-10">
      {/* Video Viewport */}
      <div className="relative aspect-video bg-gradient-primary flex items-center justify-center overflow-hidden">
        <Link
          to="/course/$courseId"
          params={{ courseId }}
          className="absolute top-4 left-4 h-10 w-10 rounded-xl bg-black/40 backdrop-blur flex items-center justify-center text-white z-10 hover:bg-black/60 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          onClick={togglePlay}
          className="h-20 w-20 rounded-full bg-white/25 hover:bg-white/35 backdrop-blur flex items-center justify-center transition-transform hover:scale-105 border-0 cursor-pointer text-white"
        >
          {isPlaying ? (
            <Pause className="h-9 w-9 fill-white" />
          ) : (
            <Play className="h-10 w-10 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Progress Bar & Timestamp */}
        <div className="absolute bottom-4 inset-x-4">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(progressSec / totalSec) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/90 mt-1.5 font-semibold">
            <span>{formatTime(progressSec)}</span>
            <span>{formatTime(totalSec)}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {lesson?.courseTitle || "Course Module"} · Lesson {lesson?.lessonNumber || 1}
          </p>
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs text-success font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold mt-1 text-foreground">{lessonTitle}</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{lessonSummary}</p>

        {/* Playback Controls */}
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={handleSkipBack}
            title={lesson?.prevLessonId ? "Previous lesson / -15s" : "-15 seconds"}
            className="h-12 w-12 rounded-2xl bg-card shadow-card flex items-center justify-center border-0 cursor-pointer hover:bg-card/80 transition-all"
          >
            <SkipBack className="h-5 w-5 text-foreground" />
          </button>

          <button
            onClick={togglePlay}
            className="h-14 w-14 rounded-2xl bg-gradient-primary text-white shadow-glow flex items-center justify-center border-0 cursor-pointer hover:opacity-95 transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white translate-x-0.5" />}
          </button>

          <button
            onClick={handleSkipForward}
            title={lesson?.nextLessonId ? "Next lesson / +15s" : "+15 seconds"}
            className="h-12 w-12 rounded-2xl bg-card shadow-card flex items-center justify-center border-0 cursor-pointer hover:bg-card/80 transition-all"
          >
            <SkipForward className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Mark Lesson Complete Button */}
        <div className="mt-6">
          <button
            onClick={handleComplete}
            disabled={completing || isCompleted}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer transition-all ${
              isCompleted
                ? "bg-success/20 text-success cursor-default"
                : "bg-gradient-primary text-white shadow-glow hover:opacity-95 disabled:opacity-50"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isCompleted ? "Lesson Completed ✓" : completing ? "Saving Progress..." : "Mark Lesson as Complete"}
          </button>
        </div>

        {/* Resources Module */}
        <div className="mt-6 p-5 rounded-2xl bg-card shadow-card border border-border/15">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <p className="font-bold text-foreground text-sm">Downloadable Lesson Resources</p>
          </div>
          <div className="space-y-2">
            {resources.map((resName: string) => (
              <div
                key={resName}
                onClick={() => {
                  const blob = new Blob([`Resource content for ${resName}`], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${resName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
                  a.click();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 cursor-pointer text-xs font-semibold text-muted-foreground transition-all"
              >
                <span>· {resName}</span>
                <Download className="h-3.5 w-3.5 text-primary" />
              </div>
            ))}
          </div>
        </div>

        {/* Next Lesson Link */}
        {lesson?.nextLessonId && (
          <div className="mt-4 text-center">
            <Link
              to="/lesson/$lessonId"
              params={{ lessonId: lesson.nextLessonId }}
              search={{ courseId }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Next Lesson →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
