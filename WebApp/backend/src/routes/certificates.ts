import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// GET USER CERTIFICATES
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data, error } = await supabaseAdmin
      .from("certificates")
      .select(
        `
        id,
        certificate_id,
        issue_date,
        course_id,
        courses (
          title
        )
      `,
      )
      .eq("user_id", userId);

    if (error) throw error;

    if (data && data.length > 0) {
      const mapped = data.map((c) => ({
        _id: c.id,
        title: (c as any).courses?.title || "Course Certificate",
        issued: new Date(c.issue_date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        color: "bg-gradient-primary",
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.error("Supabase Certificates Fetch Error:", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Failed to retrieve certificates" });
  }

  return res.json([]);
});

export default router;
