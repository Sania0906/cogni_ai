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
      const mapped = data.map(notif => ({
        _id: notif.id,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        type: notif.type,
        createdAt: notif.created_at
      }));
      return res.json(mapped);
    }

    // Seeding initial notifications if empty
    let userProfile: any = null;
    try {
      const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
      userProfile = p;
    } catch (err) {
      console.error(err);
    }

    const interests = userProfile?.interests || [];
    let roleTitle = "Senior Data Scientist";
    let companyName = "TechCorp";
    let courseTitle = "Advanced Machine Learning";
    
    if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
      roleTitle = "Full Stack Engineer";
      companyName = "Reactify";
      courseTitle = "React Web Development";
    } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
      roleTitle = "Cloud Platform Architect";
      companyName = "SkyNet Systems";
      courseTitle = "Cloud Architecture Foundations";
    } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
      roleTitle = "Cybersecurity Analyst";
      companyName = "SecureVault";
      courseTitle = "Security & Penetration Testing";
    } else if (interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"))) {
      roleTitle = "Machine Learning Engineer";
      companyName = "DeepNet Labs";
      courseTitle = "Deep Learning Foundations";
    }

    const defaultNotifications = [
      { user_id: userId, title: "New Job Match Found", message: `A new job matching 95% of your profile: ${roleTitle} at ${companyName} was posted.`, read: false, type: "job" },
      { user_id: userId, title: "Course Progress Update", message: `Congratulations! You completed 67% of '${courseTitle}'. Keep going!`, read: true, type: "course" },
      { user_id: userId, title: "Subscription Activated", message: "Your Pro plan subscription is active until June 30, 2026.", read: true, type: "billing" },
    ];

    await supabaseAdmin.from("notifications").insert(defaultNotifications);
    
    const { data: seeded } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (seeded && seeded.length > 0) {
      return res.json(seeded.map(notif => ({
        _id: notif.id,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        type: notif.type,
        createdAt: notif.created_at
      })));
    }
  } catch (err: any) {
    console.error("Supabase Notifications Fetch/Seed Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve notifications" });
  }

  return res.json([]);
});

// =========================================================================
// MARK NOTIFICATION AS READ
// =========================================================================
router.post("/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
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
      createdAt: data.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to mark read" });
  }
});

export default router;
