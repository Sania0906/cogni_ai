import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

function inferNotificationType(notif: any): string {
  if (notif.type) return notif.type;
  const text = `${notif.title || ""} ${notif.message || ""}`.toLowerCase();
  if (text.includes("application") || text.includes("job")) return "job";
  if (text.includes("resume") || text.includes("ats")) return "resume";
  if (text.includes("course") || text.includes("lesson")) return "course";
  if (text.includes("plan") || text.includes("subscription") || text.includes("billing")) return "billing";
  return "system";
}

function formatNotification(notif: any) {
  const isRead = Boolean(notif.is_read ?? notif.read);
  return {
    id: notif.id,
    _id: notif.id,
    title: notif.title,
    message: notif.message,
    read: isRead,
    is_read: isRead,
    type: inferNotificationType(notif),
    createdAt: notif.created_at,
    created_at: notif.created_at,
  };
}

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
      return res.json(data.map(formatNotification));
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
// MARK NOTIFICATION AS READ (Support POST, PUT, and PATCH)
// =========================================================================
async function handleMarkRead(req: AuthRequest, res: Response) {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("user_id", req.user?.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json(formatNotification(data));
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to mark read" });
  }
}

router.post("/:id/read", authMiddleware, handleMarkRead);
router.put("/:id/read", authMiddleware, handleMarkRead);
router.patch("/:id/read", authMiddleware, handleMarkRead);

export default router;
