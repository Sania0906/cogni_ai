import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

const DEFAULT_COURSES = [
  {
    id: "course_1",
    title: "Machine Learning Foundations",
    author: "Dr. Amara Chen",
    tags: ["AI/ML", "Data Science"],
    weeks: 8,
    rating: 4.9,
    students: "12.5k",
    description: "Master the mathematical, statistical, and practical essentials of Machine Learning with Python, Scikit-Learn, and real-world deployment.",
    lessonsCount: 6,
  },
  {
    id: "course_2",
    title: "Python Pro Patterns",
    author: "Marco Reyes",
    tags: ["Programming", "Python"],
    weeks: 6,
    rating: 4.8,
    students: "8.9k",
    description: "Deep dive into clean Python architecture, metaclasses, decorators, concurrency with asyncio, and scalable production design patterns.",
    lessonsCount: 6,
  },
  {
    id: "course_3",
    title: "Data Visualization Mastery",
    author: "Priya Shah",
    tags: ["Data Science", "Analytics"],
    weeks: 5,
    rating: 4.7,
    students: "6.3k",
    description: "Learn modern visual storytelling with D3, Matplotlib, Seaborn, and interactive dashboards for data-driven executive communication.",
    lessonsCount: 5,
  },
  {
    id: "course_4",
    title: "SQL Deep Dive & Query Optimization",
    author: "Lin Park",
    tags: ["Data Science", "Database"],
    weeks: 4,
    rating: 4.9,
    students: "11.2k",
    description: "From complex window functions and recursive CTEs to indexing internals, EXPLAIN query plans, and PostgreSQL database performance tuning.",
    lessonsCount: 5,
  },
  {
    id: "course_5",
    title: "Full Stack Cloud Development",
    author: "Alex Rivera",
    tags: ["Programming", "Cloud"],
    weeks: 10,
    rating: 4.8,
    students: "9.1k",
    description: "Build robust full-stack web architectures with React 19, TypeScript, Node.js, REST APIs, and automated CI/CD cloud deployment.",
    lessonsCount: 6,
  },
];

const STANDARD_LESSONS = [
  {
    id: "l1",
    title: "Introduction & Environment Setup",
    duration: "12 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    summary: "Set up the local development environment, initialize project dependencies, and walk through foundational architectural concepts.",
    resources: ["Setup Guide (PDF)", "Starter Code Repository", "Recommended Extensions"],
  },
  {
    id: "l2",
    title: "Core Concepts & Architecture",
    duration: "24 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    summary: "Explore the core mathematical intuitions, API specifications, and structural paradigms essential to this domain.",
    resources: ["Lecture Slides (PDF)", "Architecture Diagram (PNG)", "Concept Cheat Sheet"],
  },
  {
    id: "l3",
    title: "Hands-on Practice & Model Building",
    duration: "32 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    summary: "Apply theoretical concepts hands-on by creating your first production pipeline, writing clean unit tests, and evaluating performance metrics.",
    resources: ["Jupyter Notebook (.ipynb)", "Training Dataset (.csv)", "Solution Reference"],
  },
  {
    id: "l4",
    title: "Advanced Patterns & Optimization",
    duration: "28 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    summary: "Master hyperparameter tuning, distributed execution, caching strategies, and memory optimization.",
    resources: ["Optimization Playbook", "Benchmark Scripts", "Code Samples"],
  },
  {
    id: "l5",
    title: "Testing, Security & Quality Assurance",
    duration: "20 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    summary: "Implement robust validation gates, automated integration tests, secret protection, and edge case resilience.",
    resources: ["Security Checklist", "Test Suite Template", "CI/CD Config"],
  },
  {
    id: "l6",
    title: "Capstone Project & Production Deployment",
    duration: "45 min",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    summary: "Bring everything together by building, containerizing, and deploying a complete capstone project to a cloud runtime.",
    resources: ["Capstone Brief (PDF)", "Production Dockerfile", "Grading Rubric"],
  },
];

// Helper: Ensure default courses exist in DB
async function ensureCoursesSeeded() {
  try {
    const { count } = await supabaseAdmin.from("courses").select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      for (const c of DEFAULT_COURSES) {
        await supabaseAdmin.from("courses").upsert({
          id: c.id,
          title: c.title,
          author: c.author,
          tags: c.tags,
          weeks: c.weeks,
          rating: c.rating,
          students: c.students,
        }, { onConflict: "id" });
      }
    }
  } catch (err: any) {
    console.warn("[Courses] Seed check notice:", err?.message);
  }
}

// =========================================================================
// 1. GET COURSES CATALOG
// =========================================================================
router.get("/", async (req, res) => {
  try {
    await ensureCoursesSeeded();
    const { data, error } = await supabaseAdmin.from("courses").select("*");

    if (error) throw error;

    if (data && data.length > 0) {
      const mapped = data.map((course) => ({
        _id: course.id,
        id: course.id,
        title: course.title,
        author: course.author,
        tags: course.tags || [],
        weeks: course.weeks,
        rating: Number(course.rating),
        students: course.students,
      }));
      return res.json(mapped);
    }

    return res.json(DEFAULT_COURSES.map((c) => ({ ...c, _id: c.id })));
  } catch (err: any) {
    console.warn("Supabase Courses Fetch Warning, falling back:", err?.message);
    return res.json(DEFAULT_COURSES.map((c) => ({ ...c, _id: c.id })));
  }
});

// =========================================================================
// 2. USER ENROLLED COURSES
// =========================================================================
router.get(
  "/my-courses",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { data: enrollments, error: enrollError } = await supabaseAdmin
        .from("user_courses")
        .select(
          `
          id,
          course_id,
          progress,
          completed_lessons,
          total_lessons,
          last_accessed,
          courses (
            id,
            title,
            author,
            tags
          )
        `,
        )
        .eq("user_id", userId)
        .order("last_accessed", { ascending: false });

      if (enrollError) throw enrollError;

      if (enrollments && enrollments.length > 0) {
        return res.json(
          enrollments.map((e) => {
            const courseMeta = (e.courses as any) || DEFAULT_COURSES.find((c) => c.id === e.course_id);
            return {
              id: e.course_id,
              courseId: e.course_id,
              title: courseMeta?.title || "Course",
              instructor: courseMeta?.author || "Expert Instructor",
              progress: Number(e.progress) || 0,
              completedLessons: Number(e.completed_lessons) || 0,
              totalLessons: Number(e.total_lessons) || 6,
              lastAccessed: e.last_accessed ? new Date(e.last_accessed).toLocaleDateString() : "Recently",
            };
          }),
        );
      }
    } catch (err: any) {
      console.error("Enrolled Courses Fetch Error:", err?.message);
    }

    return res.json([]);
  },
);

// =========================================================================
// 3. GET SINGLE LESSON (Must precede /:id to avoid router collision)
// =========================================================================
router.get("/lesson/:lessonId", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const courseId = (req.query.courseId as string) || "course_1";
  const userId = req.user?.id;

  // Find matching lesson or default to lesson 1
  const index = STANDARD_LESSONS.findIndex((l) => l.id === lessonId);
  const lesson = index >= 0 ? STANDARD_LESSONS[index] : STANDARD_LESSONS[0];
  const actualIndex = index >= 0 ? index : 0;

  // Check enrollment to determine if completed
  let isDone = false;
  let courseTitle = "Machine Learning Foundations";

  try {
    if (userId) {
      const { data: enrollment } = await supabaseAdmin
        .from("user_courses")
        .select("completed_lessons, courses(title)")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (enrollment) {
        if ((enrollment.courses as any)?.title) {
          courseTitle = (enrollment.courses as any).title;
        }
        if (typeof enrollment.completed_lessons === "number") {
          isDone = actualIndex < enrollment.completed_lessons;
        }
      }
    }
  } catch {
    // ignore
  }

  const prevLessonId = actualIndex > 0 ? STANDARD_LESSONS[actualIndex - 1].id : null;
  const nextLessonId = actualIndex < STANDARD_LESSONS.length - 1 ? STANDARD_LESSONS[actualIndex + 1].id : null;

  return res.json({
    id: lesson.id,
    lessonNumber: actualIndex + 1,
    totalLessons: STANDARD_LESSONS.length,
    title: lesson.title,
    duration: lesson.duration,
    videoUrl: lesson.videoUrl,
    summary: lesson.summary,
    resources: lesson.resources,
    courseId,
    courseTitle,
    isDone,
    prevLessonId,
    nextLessonId,
  });
});

// =========================================================================
// 4. COMPLETE LESSON
// =========================================================================
router.post("/lesson/:lessonId/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { lessonId } = req.params;
  const { courseId = "course_1" } = req.body;

  const lessonIndex = STANDARD_LESSONS.findIndex((l) => l.id === lessonId);
  const targetCompletedCount = Math.max(1, (lessonIndex >= 0 ? lessonIndex + 1 : 1));
  const totalLessons = STANDARD_LESSONS.length;

  try {
    const { data: existing } = await supabaseAdmin
      .from("user_courses")
      .select("id, completed_lessons, total_lessons, progress")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    let newCompleted = targetCompletedCount;
    if (existing) {
      newCompleted = Math.max(existing.completed_lessons || 0, targetCompletedCount);
    }
    const newProgress = Math.min(100, Math.round((newCompleted / totalLessons) * 100));

    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from("user_courses")
        .update({
          completed_lessons: newCompleted,
          total_lessons: totalLessons,
          progress: newProgress,
          last_accessed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, progress: newProgress, completedLessons: newCompleted });
    } else {
      // Auto-enroll and complete
      const { data: created, error } = await supabaseAdmin
        .from("user_courses")
        .insert({
          user_id: userId,
          course_id: courseId,
          completed_lessons: newCompleted,
          total_lessons: totalLessons,
          progress: newProgress,
          last_accessed: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, progress: newProgress, completedLessons: newCompleted });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to complete lesson" });
  }
});

// =========================================================================
// 5. ENROLL IN COURSE
// =========================================================================
router.post("/:id/enroll", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id: courseId } = req.params;

  try {
    const { data: existing } = await supabaseAdmin
      .from("user_courses")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      return res.json({
        message: "Already enrolled",
        enrolled: true,
        progress: existing.progress,
        completedLessons: existing.completed_lessons,
      });
    }

    const { data: created, error } = await supabaseAdmin
      .from("user_courses")
      .insert({
        user_id: userId,
        course_id: courseId,
        progress: 0,
        completed_lessons: 0,
        total_lessons: 6,
        last_accessed: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      message: "Successfully enrolled",
      enrolled: true,
      progress: 0,
      completedLessons: 0,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to enroll in course" });
  }
});

// =========================================================================
// 6. GET SINGLE COURSE DETAILS (Dynamic Route Support)
// =========================================================================
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    let courseData: any = null;

    // Check DB
    const { data: dbCourse } = await supabaseAdmin.from("courses").select("*").eq("id", id).maybeSingle();
    if (dbCourse) {
      courseData = {
        _id: dbCourse.id,
        id: dbCourse.id,
        title: dbCourse.title,
        author: dbCourse.author,
        tags: dbCourse.tags || [],
        weeks: dbCourse.weeks,
        rating: Number(dbCourse.rating),
        students: dbCourse.students,
        description: dbCourse.description || "Master essential skills with practical hands-on projects and expert instruction.",
      };
    } else {
      // Find in default catalog or fallback
      const found = DEFAULT_COURSES.find(
        (c) => c.id === id || c.title.toLowerCase().replace(/[^a-z0-9]/g, "-") === id.toLowerCase()
      );
      if (found) {
        courseData = { ...found, _id: found.id };
      } else {
        courseData = {
          _id: id,
          id: id,
          title: decodeURIComponent(id).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          author: "Cognify AI Instructor",
          tags: ["Specialization", "Career Track"],
          weeks: 6,
          rating: 4.8,
          students: "5,000+",
          description: "Comprehensive industry-aligned course curriculum covering key concepts and real-world architectures.",
        };
      }
    }

    // Check user enrollment
    let isEnrolled = false;
    let progress = 0;
    let completedLessonsCount = 0;

    if (userId) {
      const { data: enroll } = await supabaseAdmin
        .from("user_courses")
        .select("progress, completed_lessons")
        .eq("user_id", userId)
        .eq("course_id", id)
        .maybeSingle();

      if (enroll) {
        isEnrolled = true;
        progress = Number(enroll.progress) || 0;
        completedLessonsCount = Number(enroll.completed_lessons) || 0;
      }
    }

    // Map lessons with completion status
    const lessons = STANDARD_LESSONS.map((l, index) => ({
      id: l.id,
      title: l.title,
      duration: l.duration,
      done: index < completedLessonsCount,
    }));

    // Find next uncompleted lesson
    const nextLesson = lessons.find((l) => !l.done) || lessons[0];

    return res.json({
      ...courseData,
      isEnrolled,
      progress,
      completedLessons: completedLessonsCount,
      totalLessons: lessons.length,
      nextLessonId: nextLesson?.id || "l1",
      lessons,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to retrieve course details" });
  }
});

export default router;
