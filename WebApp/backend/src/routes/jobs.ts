import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { mlService } from "../services/mlService.js";

const router = Router();

const DEFAULT_JOBS = [
  {
    id: "job_1",
    title: "Senior Data Scientist",
    company: "TechCorp Global",
    loc: "San Francisco, CA",
    type: "Full-time",
    salary: "$140k - $180k",
    match: 95,
    description: "Lead enterprise machine learning predictive model development and deployment.",
    requirements: ["Python", "Machine Learning", "SQL", "Pandas", "Scikit-Learn"],
    about: "TechCorp Global builds enterprise analytics infrastructure used across Fortune 500 companies.",
    company_id: "comp_techcorp",
  },
  {
    id: "job_2",
    title: "Machine Learning Engineer",
    company: "AIVision Labs",
    loc: "Remote",
    type: "Full-time",
    salary: "$130k - $170k",
    match: 91,
    description: "Deploy production computer vision and neural network microservices.",
    requirements: ["Python", "PyTorch", "TensorFlow", "Docker", "REST APIs"],
    about: "AIVision Labs develops high-throughput automated visual perception systems.",
    company_id: "comp_aivision",
  },
  {
    id: "job_3",
    title: "Full Stack Engineer",
    company: "Reactify Cloud",
    loc: "San Francisco, CA",
    type: "Full-time",
    salary: "$120k - $155k",
    match: 90,
    description: "Architect and maintain high-traffic web applications with React, TypeScript, and Node.js.",
    requirements: ["React", "TypeScript", "Node.js", "Express.js", "PostgreSQL"],
    about: "Reactify Cloud powers modern cloud-based web developer tooling.",
    company_id: "comp_reactify",
  },
  {
    id: "job_4",
    title: "DevOps & Cloud Architect",
    company: "SkyNet Systems",
    loc: "Remote",
    type: "Full-time",
    salary: "$140k - $175k",
    match: 88,
    description: "Design multi-region Kubernetes infrastructure and CI/CD pipelines.",
    requirements: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
    about: "SkyNet Systems manages mission-critical hybrid cloud deployments.",
    company_id: "comp_skynet",
  },
  {
    id: "job_5",
    title: "Frontend Developer",
    company: "WebFlow Studios",
    loc: "Remote",
    type: "Full-time",
    salary: "$100k - $130k",
    match: 85,
    description: "Build accessible, responsive web interfaces with React and TailwindCSS.",
    requirements: ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "TailwindCSS"],
    about: "WebFlow Studios builds interactive consumer web experiences.",
    company_id: "comp_webflow",
  },
  {
    id: "job_6",
    title: "Data Analyst",
    company: "Northwind Insights",
    loc: "New York, NY",
    type: "Full-time",
    salary: "$95k - $125k",
    match: 86,
    description: "Perform SQL data modeling, dashboard storytelling, and trend forecasting.",
    requirements: ["SQL", "Python", "Pandas", "PostgreSQL", "Database"],
    about: "Northwind Insights provides data intelligence for growth-stage startups.",
    company_id: "comp_northwind",
  },
];

// Helper to seed default jobs to DB if table is empty
async function ensureJobsSeeded() {
  try {
    const { count } = await supabaseAdmin.from("jobs").select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      for (const j of DEFAULT_JOBS) {
        await supabaseAdmin.from("jobs").upsert({
          id: j.id,
          title: j.title,
          company: j.company,
          loc: j.loc,
          type: j.type,
          salary: j.salary,
          match: j.match,
          description: j.description,
          requirements: j.requirements,
        }, { onConflict: "id" });
      }
    }
  } catch (err: any) {
    console.warn("[Jobs] Seed check notice:", err?.message);
  }
}

// =========================================================================
// 1. GET ALL JOBS
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await ensureJobsSeeded();
    const { data, error } = await supabaseAdmin.from("jobs").select("*").order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const mapped = data.map((job) => ({
        _id: job.id,
        id: job.id,
        title: job.title,
        company: job.company,
        loc: job.loc,
        type: job.type,
        salary: job.salary,
        match: job.match || 85,
        description: job.description || "",
        requirements: job.requirements || [],
      }));
      return res.json(mapped);
    }

    return res.json(DEFAULT_JOBS.map((j) => ({ ...j, _id: j.id })));
  } catch (err: any) {
    console.warn("Supabase Jobs Fetch Warning, falling back to benchmark jobs:", err?.message);
    return res.json(DEFAULT_JOBS.map((j) => ({ ...j, _id: j.id })));
  }
});

// =========================================================================
// 2. SAVED JOBS (BOOKMARKS)
// =========================================================================
router.get("/saved", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: records, error } = await supabaseAdmin
      .from("user_activity")
      .select("id, metadata, created_at")
      .eq("user_id", userId)
      .eq("action", "saved_job")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const savedList = (records || []).map((r) => ({
      id: r.metadata?.job_id || r.id,
      activity_id: r.id,
      title: r.metadata?.title || "Saved Job Position",
      co: r.metadata?.company || "Company",
      company: r.metadata?.company || "Company",
      loc: r.metadata?.loc || "Remote",
      salary: r.metadata?.salary || "$120k",
      saved_at: r.created_at,
    }));

    return res.json(savedList);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to retrieve saved jobs" });
  }
});

router.post("/save", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  try {
    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from("user_activity")
      .select("id")
      .eq("user_id", userId)
      .eq("action", "saved_job")
      .filter("metadata->>job_id", "eq", String(jobId))
      .maybeSingle();

    if (existing) {
      return res.json({ message: "Job is already bookmarked", saved: true });
    }

    // Look up job details from DB or default catalog
    let jobDetails: any = null;
    const { data: dbJob } = await supabaseAdmin.from("jobs").select("*").eq("id", jobId).maybeSingle();
    if (dbJob) {
      jobDetails = dbJob;
    } else {
      jobDetails = DEFAULT_JOBS.find((j) => j.id === jobId) || {
        id: jobId,
        title: "Software Engineer",
        company: "Tech Systems",
        loc: "Remote",
        salary: "$120k",
      };
    }

    const { error: insertErr } = await supabaseAdmin.from("user_activity").insert({
      user_id: userId,
      action: "saved_job",
      metadata: {
        job_id: String(jobId),
        title: jobDetails.title,
        company: jobDetails.company,
        loc: jobDetails.loc,
        salary: jobDetails.salary,
      },
    });

    if (insertErr) throw insertErr;

    return res.json({ message: "Job saved successfully", saved: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to bookmark job" });
  }
});

router.delete("/save/:jobId", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { jobId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("user_activity")
      .delete()
      .eq("user_id", userId)
      .eq("action", "saved_job")
      .filter("metadata->>job_id", "eq", String(jobId));

    if (error) throw error;

    return res.json({ message: "Job removed from bookmarks", saved: false });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to remove bookmarked job" });
  }
});

// =========================================================================
// 3. GET COMPANY DETAILS
// =========================================================================
router.get("/company/:companyId", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { companyId } = req.params;

  // Find jobs associated with company
  const compJobs = DEFAULT_JOBS.filter(
    (j) => j.company_id === companyId || j.company.toLowerCase().includes(companyId.toLowerCase().replace(/comp_|-/g, ""))
  );

  const compName = compJobs[0]?.company || decodeURIComponent(companyId).replace(/comp_|-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return res.json({
    id: companyId,
    name: compName,
    tagline: "Innovative technology infrastructure for next-generation systems",
    location: "Remote-first · San Francisco, CA",
    headcount: "250+ employees",
    type: "Global Enterprise",
    rating: "4.8 / 5.0",
    openings_count: compJobs.length > 0 ? compJobs.length : 3,
    match_percentage: 92,
    about: `${compName} builds resilient platforms, developer microservices, and AI-powered workflows used by top engineering organizations worldwide.`,
    open_roles: compJobs.length > 0 ? compJobs : [
      { id: "job_1", title: "Senior Data Scientist", loc: "Remote", type: "Full-time", salary: "$140k - $180k" },
      { id: "job_3", title: "Full Stack Engineer", loc: "San Francisco, CA", type: "Full-time", salary: "$120k - $155k" },
    ],
  });
});


// =========================================================================
// 5. APPLIED JOBS (Database-Backed via user_activity & applied_jobs)
// =========================================================================
router.post("/apply", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  try {
    const { data: existing } = await supabaseAdmin
      .from("user_activity")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("action", "applied_job")
      .filter("metadata->>job_id", "eq", String(jobId))
      .maybeSingle();

    if (existing) {
      return res.json({ message: "Application already submitted", applied: true, status: "Applied" });
    }

    const { data: dbJob } = await supabaseAdmin.from("jobs").select("*").eq("id", jobId).maybeSingle();
    const jobDetails = dbJob || DEFAULT_JOBS.find((j) => j.id === jobId) || {
      id: jobId,
      title: "Software Engineer",
      company: "CognifyAI Partner",
      loc: "Remote",
      salary: "$120k",
    };

    const { error: insertErr } = await supabaseAdmin.from("user_activity").insert({
      user_id: userId,
      action: "applied_job",
      metadata: {
        job_id: String(jobId),
        title: jobDetails.title,
        company: jobDetails.company,
        loc: jobDetails.loc,
        salary: jobDetails.salary,
        status: "Applied",
      },
    });
    if (insertErr) throw insertErr;

    const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Application Submitted",
      message: `Your application for ${jobDetails.title} at ${jobDetails.company} was recorded.`,
      is_read: false,
    });
    if (notifErr) {
      console.warn("[Jobs] Notification insert warning:", notifErr.message);
    }

    return res.status(201).json({
      message: "Application submitted successfully",
      applied: true,
      status: "Applied",
      jobId: String(jobId),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to submit job application" });
  }
});

router.get("/applied", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: actRows, error } = await supabaseAdmin
      .from("user_activity")
      .select("id, metadata, created_at")
      .eq("user_id", userId)
      .eq("action", "applied_job")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json(
      (actRows || []).map((app: any) => {
        const status = app.metadata?.status || "Applied";
        return {
          id: app.metadata?.job_id || app.id,
          title: app.metadata?.title || "Software Engineer",
          co: app.metadata?.company || "Tech Systems",
          company: app.metadata?.company || "Tech Systems",
          status,
          applied_at: app.created_at,
          color:
            status === "Interview"
              ? "bg-gradient-primary"
              : status === "Rejected"
                ? "bg-gradient-pink"
                : "bg-gradient-blue",
        };
      })
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to load applied jobs" });
  }
});

// =========================================================================
// 6. SALARY INSIGHTS
// =========================================================================
router.get("/salary-insights", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  let targetRole = "Full Stack Developer";
  try {
    const { data: resume } = await supabaseAdmin
      .from("resumes")
      .select("parsed_text, skills")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resume?.parsed_text) {
      const pred = await mlService.predictCareer(resume.parsed_text);
      if (pred?.predicted_role) {
        targetRole = pred.predicted_role;
      }
    }
  } catch {
    // fallback role
  }

  const roleSalaryMatrix: Record<string, any> = {
    "Data Scientist": {
      role: "Data Scientist",
      average: 145000,
      min: 110000,
      max: 195000,
      growthPercent: 14.5,
      percentiles: [
        { percentile: "10th", amount: 110000 },
        { percentile: "25th", amount: 125000 },
        { percentile: "50th (Median)", amount: 145000 },
        { percentile: "75th", amount: 168000 },
        { percentile: "90th", amount: 195000 },
      ],
      byCity: [
        { city: "San Francisco", amount: 165000 },
        { city: "New York", amount: 155000 },
        { city: "Remote (US)", amount: 140000 },
        { city: "Seattle", amount: 148000 },
        { city: "Austin", amount: 132000 },
      ],
    },
    "Machine Learning Engineer": {
      role: "Machine Learning Engineer",
      average: 155000,
      min: 120000,
      max: 210000,
      growthPercent: 18.9,
      percentiles: [
        { percentile: "10th", amount: 120000 },
        { percentile: "25th", amount: 138000 },
        { percentile: "50th (Median)", amount: 155000 },
        { percentile: "75th", amount: 182000 },
        { percentile: "90th", amount: 210000 },
      ],
      byCity: [
        { city: "San Francisco", amount: 175000 },
        { city: "New York", amount: 165000 },
        { city: "Remote (US)", amount: 150000 },
        { city: "Seattle", amount: 158000 },
        { city: "Austin", amount: 142000 },
      ],
    },
    "Full Stack Developer": {
      role: "Full Stack Developer",
      average: 125000,
      min: 95000,
      max: 165000,
      growthPercent: 9.5,
      percentiles: [
        { percentile: "10th", amount: 95000 },
        { percentile: "25th", amount: 110000 },
        { percentile: "50th (Median)", amount: 125000 },
        { percentile: "75th", amount: 145000 },
        { percentile: "90th", amount: 165000 },
      ],
      byCity: [
        { city: "San Francisco", amount: 145000 },
        { city: "New York", amount: 135000 },
        { city: "Remote (US)", amount: 120000 },
        { city: "Seattle", amount: 130000 },
        { city: "Austin", amount: 115000 },
      ],
    },
    "DevOps Engineer": {
      role: "DevOps Engineer",
      average: 135000,
      min: 100000,
      max: 180000,
      growthPercent: 13.2,
      percentiles: [
        { percentile: "10th", amount: 100000 },
        { percentile: "25th", amount: 118000 },
        { percentile: "50th (Median)", amount: 135000 },
        { percentile: "75th", amount: 158000 },
        { percentile: "90th", amount: 180000 },
      ],
      byCity: [
        { city: "San Francisco", amount: 155000 },
        { city: "New York", amount: 145000 },
        { city: "Remote (US)", amount: 130000 },
        { city: "Seattle", amount: 140000 },
        { city: "Austin", amount: 125000 },
      ],
    },
  };

  const payload = roleSalaryMatrix[targetRole] || roleSalaryMatrix["Full Stack Developer"];
  return res.json(payload);
});

// =========================================================================
// 7. GET JOB RECOMMENDATIONS (ML-Powered)
// =========================================================================
router.get("/recommend", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let targetRole = "Full Stack Developer";

    if (userId) {
      const { data: resume } = await supabaseAdmin
        .from("resumes")
        .select("parsed_text")
        .eq("user_id", userId)
        .order("upload_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resume?.parsed_text) {
        const pred = await mlService.predictCareer(resume.parsed_text);
        if (pred?.predicted_role) {
          targetRole = pred.predicted_role;
        }
      }
    }

    const { data: allJobs } = await supabaseAdmin.from("jobs").select("*");
    const catalog = (allJobs && allJobs.length > 0) ? allJobs : DEFAULT_JOBS;

    // Filter/rank by match with targetRole
    const ranked = catalog.map((j) => {
      const isTarget = j.title.toLowerCase().includes(targetRole.toLowerCase().split(" ")[0]);
      return {
        id: j.id,
        _id: j.id,
        title: j.title,
        company: j.company,
        loc: j.loc,
        salary: j.salary,
        salaryRange: j.salary,
        matchPercentage: isTarget ? 95 : (j.match || 82),
        requiredSkills: j.requirements || ["Python", "SQL"],
        missingSkills: ["Cloud Architecture"],
        learningRoadmap: [
          `Master modern requirements for ${j.title}`,
          "Complete hands-on portfolio case study",
        ],
      };
    });

    ranked.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.json(ranked);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to generate job recommendations" });
  }
});

// =========================================================================
// 8. GET SINGLE JOB DETAILS (Dynamic Route Support - Placed last to avoid collisions)
// =========================================================================
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // 1. Check Supabase jobs table
    const { data: dbJob } = await supabaseAdmin.from("jobs").select("*").eq("id", id).maybeSingle();

    let jobData: any = dbJob;

    // 2. Fallback to default catalog
    if (!jobData) {
      jobData = DEFAULT_JOBS.find((j) => j.id === id);
    }

    if (!jobData) {
      return res.status(404).json({ message: `Job with ID '${id}' was not found.` });
    }

    // Check if bookmarked or applied by current user
    let isSaved = false;
    let isApplied = false;
    if (userId) {
      const [{ data: savedAct }, { data: appliedAct }] = await Promise.all([
        supabaseAdmin
          .from("user_activity")
          .select("id")
          .eq("user_id", userId)
          .eq("action", "saved_job")
          .filter("metadata->>job_id", "eq", String(id))
          .maybeSingle(),
        supabaseAdmin
          .from("user_activity")
          .select("id")
          .eq("user_id", userId)
          .eq("action", "applied_job")
          .filter("metadata->>job_id", "eq", String(id))
          .maybeSingle(),
      ]);

      isSaved = !!savedAct;
      isApplied = !!appliedAct;
    }

    return res.json({
      _id: jobData.id,
      id: jobData.id,
      title: jobData.title,
      company: jobData.company,
      company_id: jobData.company_id || "comp_techcorp",
      loc: jobData.loc,
      type: jobData.type,
      salary: jobData.salary,
      match: jobData.match || 88,
      description: jobData.description || "Exciting role collaborating with an agile product engineering squad.",
      about: jobData.about || "Leading tech organization creating impactful developer-first solutions.",
      requirements: jobData.requirements || ["JavaScript", "TypeScript", "SQL"],
      is_saved: isSaved,
      is_applied: isApplied,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch job details" });
  }
});

export default router;
