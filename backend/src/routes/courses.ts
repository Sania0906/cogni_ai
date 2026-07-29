import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// GET COURSES CATALOG
// =========================================================================
router.get("/", async (req, res) => {
  try {
    let { data, error } = await supabaseAdmin.from("courses").select("*");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json([]);
    }

    if (data) {
      const mapped = data.map((course) => ({
        _id: course.id,
        title: course.title,
        author: course.author,
        tags: course.tags || [],
        weeks: course.weeks,
        rating: Number(course.rating),
        students: course.students,
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.error("Supabase Courses Fetch Error:", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Failed to retrieve courses catalog" });
  }
});

// =========================================================================
// USER ENROLLED COURSES
// =========================================================================
router.get(
  "/my-courses",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    try {
      const { data: enrollments, error: enrollError } = await supabaseAdmin
        .from("user_courses")
        .select(
          `
        course_id,
        progress,
        completed_lessons,
        total_lessons,
        last_accessed,
        courses (
          title
        )
      `,
        )
        .eq("user_id", userId);

      if (enrollError) throw enrollError;

      if (enrollments && enrollments.length > 0) {
        return res.json(
          enrollments.map((e) => ({
            courseId: e.course_id,
            title: (e.courses as any)?.title || "Enrolled Course",
            progress: e.progress,
            completedLessons: e.completed_lessons,
            totalLessons: e.total_lessons,
            lastAccessed: new Date(e.last_accessed).toLocaleDateString(),
          })),
        );
      }
    } catch (err: any) {
      console.error("Enrolled Courses Fetch Error:", err.message);
      return res
        .status(500)
        .json({
          message: err.message || "Failed to retrieve enrolled courses",
        });
    }

    return res.json([]);
  },
);

export default router;
