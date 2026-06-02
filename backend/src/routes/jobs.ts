import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

const DEFAULT_JOBS = [
  { id: "job_1", title: "Senior Data Scientist", company: "TechCorp", loc: "San Francisco, CA", type: "Full-time", salary: "$140k - $180k", match: 95, description: "Lead machine learning models deployment.", requirements: ["Python", "Machine Learning", "SQL"] },
  { id: "job_2", title: "ML Engineer", company: "AIVision", loc: "Remote", type: "Full-time", salary: "$130k - $170k", match: 91, description: "Deploy deep learning computer vision solutions.", requirements: ["Python", "PyTorch", "TensorFlow"] },
  { id: "job_3", title: "AI Research Scientist", company: "NeuralLabs", loc: "New York, NY", type: "Full-time", salary: "$160k - $220k", match: 88, description: "Pioneering LLM research projects.", requirements: ["Deep Learning", "Transformers", "Math"] },
  { id: "job_4", title: "MLOps Engineer", company: "SystemsInc", loc: "Remote", type: "Full-time", salary: "$120k - $155k", match: 72, description: "Establish scalable pipeline orchestrations.", requirements: ["Docker", "MLflow", "FastAPI"] },
  { id: "job_web_1", title: "Frontend Developer", company: "WebFlow Inc", loc: "Remote", type: "Full-time", salary: "$100k - $130k", match: 85, description: "Create responsive user interfaces.", requirements: ["JavaScript", "React", "CSS"] },
  { id: "job_web_2", title: "Full Stack Engineer", company: "Reactify", loc: "San Francisco, CA", type: "Full-time", salary: "$120k - $150k", match: 90, description: "Build scalable full stack apps.", requirements: ["React", "Node.js", "SQL"] },
  { id: "job_cloud_1", title: "Cloud Solutions Architect", company: "SkyNet Systems", loc: "Remote", type: "Full-time", salary: "$140k - $170k", match: 89, description: "Design cloud native architectures.", requirements: ["AWS", "Docker", "Kubernetes"] },
  { id: "job_sec_1", title: "Cybersecurity Analyst", company: "SecureVault", loc: "New York, NY", type: "Full-time", salary: "$110k - $140k", match: 82, description: "Audit security protocols and networks.", requirements: ["Network Security", "Linux", "Cryptography"] }
];

// =========================================================================
// GET JOBS LIST
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let { data, error } = await supabaseAdmin
      .from("jobs")
      .select("*");

    if (error) throw error;

    // Seed default jobs if database is empty
    if (!data || data.length === 0) {
      console.log("[Supabase Jobs] Table is empty. Seeding default jobs...");
      await supabaseAdmin.from("jobs").insert(DEFAULT_JOBS);
      const { data: refetched, error: refetchError } = await supabaseAdmin
        .from("jobs")
        .select("*");
      if (refetchError) throw refetchError;
      data = refetched;
    }

    if (data) {
      const mapped = data.map(job => ({
        _id: job.id,
        title: job.title,
        company: job.company,
        loc: job.loc,
        type: job.type,
        salary: job.salary,
        match: job.match,
        description: job.description || "",
        requirements: job.requirements || []
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.error("Supabase Jobs Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve jobs catalog" });
  }
});

// =========================================================================
// HELPER: USER STATE RETRIEVAL
// =========================================================================
async function getUserProfile(userId: string) {
  try {
    const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data;
  } catch (err) {
    console.error("Error fetching user profile for jobs:", err);
    return null;
  }
}

// =========================================================================
// GET APPLIED JOBS
// =========================================================================
router.get("/applied", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    let { data, error } = await supabaseAdmin
      .from("applied_jobs")
      .select(`
        id,
        status,
        job_id,
        jobs (
          id,
          title,
          company
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    // Seed default applications if empty
    if (!data || data.length === 0) {
      console.log(`[Supabase Applied Jobs] No application records found for ${userId}. Dynamic seeding...`);
      const profile = await getUserProfile(userId);
      const interests = profile?.interests || [];
      
      let initialJobIds = ["job_1", "job_2"];
      if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
        initialJobIds = ["job_web_1", "job_web_2"];
      } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
        initialJobIds = ["job_cloud_1", "job_4"];
      } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
        initialJobIds = ["job_sec_1", "job_4"];
      }

      const rowsToInsert = [
        { user_id: userId, job_id: initialJobIds[0], status: "Interview" },
        { user_id: userId, job_id: initialJobIds[1], status: "Applied" }
      ];

      await supabaseAdmin.from("applied_jobs").upsert(rowsToInsert, { onConflict: "user_id,job_id" });

      // Fetch again to return populated fields
      const { data: seeded, error: refetchError } = await supabaseAdmin
        .from("applied_jobs")
        .select(`
          id,
          status,
          job_id,
          jobs (
            id,
            title,
            company
          )
        `)
        .eq("user_id", userId);

      if (refetchError) throw refetchError;
      data = seeded || [];
    }

    return res.json((data || []).map(app => ({
      id: app.job_id,
      title: (app.jobs as any)?.title || "Unknown Job",
      co: (app.jobs as any)?.company || "Unknown Company",
      status: app.status,
      color: app.status === "Interview" ? "bg-gradient-primary" : app.status === "Rejected" ? "bg-gradient-pink" : "bg-gradient-blue"
    })));
  } catch (err: any) {
    console.error("Applied Jobs Fetch Error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch applied jobs" });
  }
});

// =========================================================================
// SALARY INSIGHTS
// =========================================================================
router.get("/salary-insights", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const profile = await getUserProfile(userId);
  const interests = profile?.interests || [];
  
  let role = "Senior Data Scientist";
  let average = 145000;
  let min = 110000;
  let max = 195000;
  let growthPercent = 14.5;
  let percentiles = [
    { percentile: "10th", amount: 110000 },
    { percentile: "25th", amount: 125000 },
    { percentile: "50th (Median)", amount: 145000 },
    { percentile: "75th", amount: 168000 },
    { percentile: "90th", amount: 195000 }
  ];
  let byCity = [
    { city: "San Francisco", amount: 165000 },
    { city: "New York", amount: 155000 },
    { city: "Remote (US)", amount: 140000 },
    { city: "Seattle", amount: 148000 },
    { city: "Austin", amount: 132000 }
  ];
  
  if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
    role = "Full Stack Developer";
    average = 115000;
    min = 85000;
    max = 160000;
    growthPercent = 8.2;
    percentiles = [
      { percentile: "10th", amount: 85000 },
      { percentile: "25th", amount: 100000 },
      { percentile: "50th (Median)", amount: 115000 },
      { percentile: "75th", amount: 138000 },
      { percentile: "90th", amount: 160000 }
    ];
    byCity = [
      { city: "San Francisco", amount: 135000 },
      { city: "New York", amount: 125000 },
      { city: "Remote (US)", amount: 110000 },
      { city: "Seattle", amount: 120000 },
      { city: "Austin", amount: 105000 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
    role = "Cloud Engineer";
    average = 130000;
    min = 95000;
    max = 175000;
    growthPercent = 12.1;
    percentiles = [
      { percentile: "10th", amount: 95000 },
      { percentile: "25th", amount: 112000 },
      { percentile: "50th (Median)", amount: 130000 },
      { percentile: "75th", amount: 152000 },
      { percentile: "90th", amount: 175000 }
    ];
    byCity = [
      { city: "San Francisco", amount: 150000 },
      { city: "New York", amount: 142000 },
      { city: "Remote (US)", amount: 125000 },
      { city: "Seattle", amount: 135000 },
      { city: "Austin", amount: 120000 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
    role = "Cybersecurity Analyst";
    average = 122000;
    min = 90000;
    max = 165000;
    growthPercent = 10.4;
    percentiles = [
      { percentile: "10th", amount: 90000 },
      { percentile: "25th", amount: 105000 },
      { percentile: "50th (Median)", amount: 122000 },
      { percentile: "75th", amount: 144000 },
      { percentile: "90th", amount: 165000 }
    ];
    byCity = [
      { city: "San Francisco", amount: 140000 },
      { city: "New York", amount: 132000 },
      { city: "Remote (US)", amount: 118000 },
      { city: "Seattle", amount: 126000 },
      { city: "Austin", amount: 112000 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"))) {
    role = "AI Engineer";
    average = 155000;
    min = 120000;
    max = 210000;
    growthPercent = 18.9;
    percentiles = [
      { percentile: "10th", amount: 120000 },
      { percentile: "25th", amount: 138000 },
      { percentile: "50th (Median)", amount: 155000 },
      { percentile: "75th", amount: 182000 },
      { percentile: "90th", amount: 210000 }
    ];
    byCity = [
      { city: "San Francisco", amount: 175000 },
      { city: "New York", amount: 165000 },
      { city: "Remote (US)", amount: 150000 },
      { city: "Seattle", amount: 158000 },
      { city: "Austin", amount: 142000 }
    ];
  }
  
  return res.json({
    role,
    average,
    min,
    max,
    growthPercent,
    percentiles,
    byCity
  });
});

export default router;
