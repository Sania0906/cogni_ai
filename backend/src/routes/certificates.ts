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
      .select(`
        id,
        certificate_id,
        issue_date,
        course_id,
        courses (
          title
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    if (data && data.length > 0) {
      const mapped = data.map(c => ({
        _id: c.id,
        title: (c as any).courses?.title || "Course Certificate",
        issued: new Date(c.issue_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        color: "bg-gradient-primary"
      }));
      return res.json(mapped);
    } else {
      // Seed initial certificates!
      let userProfile: any = null;
      try {
        const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
        userProfile = p;
      } catch (pErr) {
        console.error(pErr);
      }

      const interests = userProfile?.interests || [];
      const certsToInsert = [
        {
          user_id: userId,
          course_id: "course_3", // Python for Data Science
          certificate_id: `CERT-PY-${userId?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          issue_date: new Date(Date.now() - 60 * 86400000).toISOString() // 60 days ago
        }
      ];

      if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
        certsToInsert.push({
          user_id: userId,
          course_id: "course_web_2", // SQL & Databases
          certificate_id: `CERT-WEB-${userId?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          issue_date: new Date(Date.now() - 30 * 86400000).toISOString()
        });
      } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
        certsToInsert.push({
          user_id: userId,
          course_id: "course_cloud_1", // Cloud Architecture
          certificate_id: `CERT-CLD-${userId?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          issue_date: new Date(Date.now() - 30 * 86400000).toISOString()
        });
      } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
        certsToInsert.push({
          user_id: userId,
          course_id: "course_sec_1", // Security & Penetration
          certificate_id: `CERT-SEC-${userId?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          issue_date: new Date(Date.now() - 30 * 86400000).toISOString()
        });
      } else {
        certsToInsert.push({
          user_id: userId,
          course_id: "course_2", // Deep Learning Foundations
          certificate_id: `CERT-DL-${userId?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          issue_date: new Date(Date.now() - 30 * 86400000).toISOString()
        });
      }

      await supabaseAdmin.from("certificates").insert(certsToInsert);

      // Query again to get courses titles populated
      const { data: seeded } = await supabaseAdmin
        .from("certificates")
        .select(`
          id,
          certificate_id,
          issue_date,
          course_id,
          courses (
            title
          )
        `)
        .eq("user_id", userId);

      if (seeded && seeded.length > 0) {
        return res.json(seeded.map(c => ({
          _id: c.id,
          title: (c as any).courses?.title || "Course Certificate",
          issued: new Date(c.issue_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          color: "bg-gradient-primary"
        })));
      }
    }
  } catch (err: any) {
    console.error("Supabase Certificates Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve certificates" });
  }

  return res.json([]);
});

export default router;
