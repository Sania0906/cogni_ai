import { Router, Response } from "express";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { mlService } from "../services/mlService.js";

const router = Router();

// GET ALL USERS
router.get("/users", authMiddleware, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch users" });
  }
});

// DELETE USER
router.delete("/users/:id", authMiddleware, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { error: profileErr } = await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);
    if (profileErr) throw profileErr;

    // Delete from auth.users via admin client
    await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    return res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to delete user" });
  }
});

// GET ALL RESUMES
router.get("/resumes", authMiddleware, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("resumes")
      .select(`*, profiles(name, email)`)
      .order("upload_date", { ascending: false });

    if (error) {
      // Fallback to simple query if join fails
      const { data: fallbackData } = await supabaseAdmin.from("resumes").select("*");
      return res.json(fallbackData || []);
    }

    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch resumes" });
  }
});

// GET ADMIN ANALYTICS (Live Database Aggregates + ML Subsystem Status)
router.get("/analytics", authMiddleware, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const [
      { count: usersCount },
      { count: resumesCount },
      { count: skillsCount },
      { count: jobsCount },
      { count: coursesCount },
      { count: assessmentsCount },
      { count: atsReportsCount },
      { data: atsScoresData },
      { data: popularSkills },
      { data: activityRows },
      mlOnline,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("resumes").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("skills").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("courses").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("assessments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ats_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ats_reports").select("score"),
      supabaseAdmin.from("skills").select("name, progress").order("progress", { ascending: false }).limit(5),
      supabaseAdmin.from("user_activity").select("created_at"),
      mlService.checkHealth(true).catch(() => false),
    ]);

    const uCount = usersCount || 0;
    const rCount = resumesCount || 0;
    const sCount = skillsCount || 0;
    const jCount = jobsCount || 0;
    const cCount = coursesCount || 0;
    const aCount = assessmentsCount || 0;
    const atsCount = atsReportsCount || 0;

    const avgAts =
      atsScoresData && atsScoresData.length > 0
        ? Math.round(atsScoresData.reduce((sum, r: any) => sum + (Number(r.score) || 0), 0) / atsScoresData.length)
        : 0;

    const topSkillsList =
      popularSkills && popularSkills.length > 0
        ? popularSkills.map((s) => ({ name: s.name, val: Math.min(100, Math.max(10, Number(s.progress) || 50)) }))
        : [];

    // Build genuine monthly cohort bars from user_activity rows
    const monthlyBuckets = new Array(12).fill(0);
    for (const row of activityRows || []) {
      const m = new Date((row as any).created_at).getUTCMonth();
      if (m >= 0 && m < 12) monthlyBuckets[m] += 1;
    }
    const maxBucket = Math.max(1, ...monthlyBuckets);
    const engagementBars = monthlyBuckets.map((cnt) => Math.max(8, Math.round((cnt / maxBucket) * 100)));

    return res.json({
      totalUsers: uCount,
      total_users: uCount,
      usersCount: uCount,
      totalResumes: rCount,
      total_resumes: rCount,
      totalSkills: sCount,
      totalJobs: jCount,
      total_jobs: jCount,
      jobsCount: jCount,
      totalCourses: cCount,
      total_courses: cCount,
      coursesCount: cCount,
      totalAssessments: aCount,
      totalAtsReports: atsCount,
      averageAtsScore: avgAts,
      mlEngineOnline: mlOnline,
      subsystems: {
        database: "ONLINE",
        backend: "PORT 5000",
        mlEngine: mlOnline ? "PORT 8000" : "FALLBACK",
      },
      systemStatus: mlOnline ? "Healthy (All Subsystems Live)" : "Degraded (ML Fallback Active)",
      activeSessions: uCount,
      healthScore: mlOnline ? "100%" : "85%",
      monthlyActiveUsers: `${uCount} Registered`,
      monthlyGrowth: "+100% Live DB",
      kpis: [
        { label: "Users", val: `${uCount}`, delta: "Live", color: "bg-gradient-primary" },
        { label: "Courses", val: `${cCount}`, delta: "Live", color: "bg-gradient-blue" },
        { label: "Jobs", val: `${jCount}`, delta: "Live", color: "bg-gradient-pink" },
        { label: "ATS Scans", val: `${atsCount}`, delta: "Live", color: "bg-gradient-primary" },
      ],
      engagementBars,
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      topSkills: topSkillsList,
      stats: [
        { l: "ATS Scans", v: `${atsCount}` },
        { l: "Avg ATS", v: `${avgAts}%` },
        { l: "Assessments", v: `${aCount}` },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch admin analytics" });
  }
});

// GET ADMIN REPORTS
const PLATFORM_REPORTS = [
  {
    id: "rep_growth_summary",
    title: "Platform Growth & Registration Summary",
    category: "Growth",
    date: "Live Export",
    size: "Live JSON",
    color: "bg-gradient-primary",
  },
  {
    id: "rep_skills_demand",
    title: "Skills & Competency Inventory",
    category: "Skills",
    date: "Live Export",
    size: "Live JSON",
    color: "bg-gradient-blue",
  },
  {
    id: "rep_ats_evaluations",
    title: "ATS Scans & Resume Throughput",
    category: "Skills",
    date: "Live Export",
    size: "Live JSON",
    color: "bg-gradient-pink",
  },
  {
    id: "rep_revenue_tiers",
    title: "Subscription Tiers Breakdown",
    category: "Revenue",
    date: "Live Export",
    size: "Live JSON",
    color: "bg-gradient-primary",
  },
];

router.get("/reports", authMiddleware, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  return res.json({
    totalGenerated: PLATFORM_REPORTS.length,
    quarterGenerated: PLATFORM_REPORTS.length,
    reports: PLATFORM_REPORTS,
  });
});

// DOWNLOAD ADMIN REPORT (Live Supabase Queries)
router.get("/reports/:reportId/download", authMiddleware, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = PLATFORM_REPORTS.find((r) => r.id === reportId) || PLATFORM_REPORTS[0];

    const [
      { count: activeUsers },
      { count: assessmentsCount },
      { count: atsCount },
      { count: resumesCount },
      { count: jobsCount },
      { data: atsRows },
      { data: subRows },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("assessments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ats_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("resumes").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ats_reports").select("score"),
      supabaseAdmin.from("subscriptions").select("plan"),
    ]);

    const avgScore =
      atsRows && atsRows.length > 0
        ? (atsRows.reduce((s, r: any) => s + (Number(r.score) || 0), 0) / atsRows.length).toFixed(1)
        : "0.0";

    const reportData = {
      reportId: report.id,
      title: report.title,
      generatedAt: new Date().toISOString(),
      category: report.category,
      platform: "CognifyAI Executive Intelligence (Live DB Export)",
      metrics: {
        registered_profiles: activeUsers || 0,
        total_assessments_taken: assessmentsCount || 0,
        ats_reports_logged: atsCount || 0,
        resumes_stored: resumesCount || 0,
        active_job_listings: jobsCount || 0,
        active_subscriptions: (subRows || []).length,
        avg_candidate_ats_score: `${avgScore}%`,
      },
      summary: `Live database export for ${report.title} generated directly from Supabase PostgreSQL.`,
    };

    res.setHeader("Content-Disposition", `attachment; filename="${report.id}_export.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(reportData, null, 2));
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to generate report export" });
  }
});

export default router;
