import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

const DEFAULT_COURSES = [
  { id: "course_1", title: "Advanced Machine Learning", author: "Dr. Sarah Johnson", tags: ["Advanced", "Data Science"], weeks: 8, rating: 4.8, students: "12.5k" },
  { id: "course_2", title: "Deep Learning Foundations", author: "Prof. Mike Chen", tags: ["Intermediate", "AI/ML"], weeks: 6, rating: 4.7, students: "9.2k" },
  { id: "course_3", title: "Python for Data Science", author: "Anna Lee", tags: ["Beginner", "Programming"], weeks: 4, rating: 4.9, students: "20.1k" },
  { id: "course_4", title: "MLOps: Deploying Models to Production", author: "Jane Dev", tags: ["Intermediate", "Systems"], weeks: 5, rating: 4.6, students: "5.4k" },
  { id: "course_5", title: "Data Visualization & Analysis", author: "David Gray", tags: ["Beginner", "Design"], weeks: 4, rating: 4.5, students: "8.1k" },
  { id: "course_web_1", title: "React Web Development", author: "Sarah Croft", tags: ["Intermediate", "Web"], weeks: 8, rating: 4.8, students: "11.2k" },
  { id: "course_web_2", title: "SQL & Databases Course", author: "Marcus Aurelius", tags: ["Beginner", "Databases"], weeks: 6, rating: 4.7, students: "14.5k" },
  { id: "course_cloud_1", title: "Cloud Architecture Foundations", author: "Gale S.", tags: ["Intermediate", "Cloud"], weeks: 7, rating: 4.6, students: "7.9k" },
  { id: "course_sec_1", title: "Security & Penetration Testing", author: "Bruce Wayne", tags: ["Advanced", "Security"], weeks: 9, rating: 4.9, students: "6.3k" }
];

// =========================================================================
// GET COURSES CATALOG
// =========================================================================
router.get("/", async (req, res) => {
  try {
    let { data, error } = await supabaseAdmin
      .from("courses")
      .select("*");

    if (error) throw error;

    // Seed default courses if database is empty
    if (!data || data.length === 0) {
      console.log("[Supabase Courses] Catalog is empty. Seeding default courses...");
      await supabaseAdmin.from("courses").insert(DEFAULT_COURSES);
      const { data: refetched, error: refetchError } = await supabaseAdmin
        .from("courses")
        .select("*");
      if (refetchError) throw refetchError;
      data = refetched;
    }

    if (data) {
      const mapped = data.map(course => ({
        _id: course.id,
        title: course.title,
        author: course.author,
        tags: course.tags || [],
        weeks: course.weeks,
        rating: Number(course.rating),
        students: course.students
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.error("Supabase Courses Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve courses catalog" });
  }
});

// =========================================================================
// USER ENROLLED COURSES
// =========================================================================
router.get("/my-courses", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from("user_courses")
      .select(`
        course_id,
        progress,
        completed_lessons,
        total_lessons,
        last_accessed,
        courses (
          title
        )
      `)
      .eq("user_id", userId);

    if (enrollError) throw enrollError;

    if (enrollments && enrollments.length > 0) {
      return res.json(enrollments.map(e => ({
        courseId: e.course_id,
        title: (e.courses as any)?.title || "Enrolled Course",
        progress: e.progress,
        completedLessons: e.completed_lessons,
        totalLessons: e.total_lessons,
        lastAccessed: new Date(e.last_accessed).toLocaleDateString(),
      })));
    }
  } catch (err: any) {
    console.error("Enrolled Courses Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve enrolled courses" });
  }

  return res.json([]);
});

export default router;
