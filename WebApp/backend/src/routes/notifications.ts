import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// GET USER NOTIFICATIONS
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const mapped = data.map((notif) => ({
        _id: notif.id,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        type: notif.type,
        createdAt: notif.created_at,
      }));
      return res.json(mapped);
    }

    return res.json([]);
  } catch (err: any) {
    console.error("Supabase Notifications Fetch Error:", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Failed to retrieve notifications" });
  }
});

// =========================================================================
// MARK NOTIFICATION AS READ
// =========================================================================
router.post(
  "/:id/read",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({ read: true })
        .eq("id", req.params.id)
        .eq("user_id", req.user?.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      return res.json({
        _id: data.id,
        title: data.title,
        message: data.message,
        read: data.read,
        type: data.type,
        createdAt: data.created_at,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to mark read" });
    }
  },
);

export default router;
