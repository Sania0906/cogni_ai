import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import authRoutes from "../routes/auth.js";
import skillsRoutes from "../routes/skills.js";
import skillRoutes from "../routes/skill.js";
import coursesRoutes from "../routes/courses.js";
import jobsRoutes from "../routes/jobs.js";
import adminRoutes from "../routes/admin.js";
import certificateRoutes from "../routes/certificates.js";
import subscriptionRoutes from "../routes/subscriptions.js";
import aiRoutes from "../routes/ai.js";
import recruiterRoutes from "../routes/recruiter.js";
import resumeRoutes from "../routes/resume.js";
import { resolveTestAdminCredentials, type TestAdminContext } from "./testAdminHelper.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/skill", skillRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/resume", resumeRoutes);

const TEST_PORT = 5006;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let server: any;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[Phase 4 Test Server] Listening on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`[Phase 4 Test Server] Closed.`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string = ""): void {
  if (condition) {
    console.log(`  ✅ PASS: ${testName} ${detail ? "(" + detail + ")" : ""}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? "(" + detail + ")" : ""}`);
    failCount++;
  }
}

async function runPhase4Verification() {
  console.log("================================================================================");
  console.log("  PHASE 4: COGNIFYAI WEB APPLICATION & DATABASE INTEGRATION VERIFICATION");
  console.log("================================================================================");

  await startServer();

  let adminToken = "";
  let adminCtx: TestAdminContext | null = null;
  let userToken = "";
  const testEmail = `test_p4_${Date.now()}@cognifyai.com`;
  const testPassword = "Password123!";

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & SESSIONS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 1] Authentication & Sessions");

    // Login as Admin
    adminCtx = await resolveTestAdminCredentials();
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminCtx.email, password: adminCtx.password }),
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token || adminData.access_token || "";
    assert(adminLoginRes.status === 200 && adminData.user?.role === "admin", "Admin Login & Role", `role: ${adminData.user?.role}`);

    // Register User
    const userRegRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase4 User", email: testEmail, password: testPassword, confirmPassword: testPassword, role: "user" }),
    });
    const userRegData = await userRegRes.json();
    assert(userRegRes.status === 201 || userRegRes.status === 200, "User Registration", `email: ${testEmail}`);

    // Login User
    const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const userLoginData = await userLoginRes.json();
    userToken = userLoginData.token || userLoginData.access_token || "";
    assert(userLoginRes.status === 200 && userLoginData.user?.role === "user", "User Login & Token Generation", `role: ${userLoginData.user?.role}`);

    // -------------------------------------------------------------------------
    // 2. DYNAMIC COURSES & LEARNING ROUTES
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 2] Dynamic Courses & Learning Architecture");

    // GET /api/courses
    const coursesRes = await fetch(`${BASE_URL}/courses`);
    const coursesList = await coursesRes.json();
    assert(coursesRes.status === 200 && Array.isArray(coursesList) && coursesList.length >= 4, "Course Catalog Fetch", `${coursesList.length} courses`);

    // GET /api/courses/:id
    const singleCourseRes = await fetch(`${BASE_URL}/courses/course_1`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const singleCourse = await singleCourseRes.json();
    assert(
      singleCourseRes.status === 200 && !!singleCourse.title && Array.isArray(singleCourse.lessons),
      "Dynamic Route: course.$courseId.tsx",
      `Title: ${singleCourse.title}, Lessons: ${singleCourse.lessons?.length}`
    );

    // POST /api/courses/:id/enroll
    const enrollRes = await fetch(`${BASE_URL}/courses/course_1/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const enrollData = await enrollRes.json();
    assert(enrollRes.status === 200 && enrollData.enrolled === true, "Enroll in Course Action", enrollData.message);

    // GET /api/courses/lesson/:lessonId
    const lessonRes = await fetch(`${BASE_URL}/courses/lesson/l1?courseId=course_1`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const lessonData = await lessonRes.json();
    assert(
      lessonRes.status === 200 && lessonData.title === "Introduction & Environment Setup" && Array.isArray(lessonData.resources),
      "Dynamic Route: lesson.$lessonId.tsx",
      `Duration: ${lessonData.duration}, Resources: ${lessonData.resources?.length}`
    );

    // POST /api/courses/lesson/:lessonId/complete
    const completeLessonRes = await fetch(`${BASE_URL}/courses/lesson/l1/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ courseId: "course_1" }),
    });
    const completeLessonData = await completeLessonRes.json();
    assert(
      completeLessonRes.status === 200 && completeLessonData.success === true && completeLessonData.progress > 0,
      "Complete Lesson & Progress Recalculation",
      `Progress: ${completeLessonData.progress}%, Completed: ${completeLessonData.completedLessons}`
    );

    // GET /api/courses/my-courses
    const myCoursesRes = await fetch(`${BASE_URL}/courses/my-courses`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const myCoursesData = await myCoursesRes.json();
    assert(
      myCoursesRes.status === 200 && Array.isArray(myCoursesData) && myCoursesData.some((c) => c.courseId === "course_1"),
      "User Enrolled Courses Persistence",
      `Enrolled courses count: ${myCoursesData.length}`
    );

    // -------------------------------------------------------------------------
    // 3. DYNAMIC JOBS & BOOKMARKS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 3] Dynamic Job Portal, Bookmarking & Companies");

    // GET /api/jobs
    const jobsRes = await fetch(`${BASE_URL}/jobs`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const jobsList = await jobsRes.json();
    assert(jobsRes.status === 200 && Array.isArray(jobsList) && jobsList.length >= 4, "Job Catalog Listing", `${jobsList.length} jobs`);

    // GET /api/jobs/:id
    const singleJobRes = await fetch(`${BASE_URL}/jobs/job_1`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const singleJob = await singleJobRes.json();
    assert(
      singleJobRes.status === 200 && singleJob.title === "Senior Data Scientist" && Array.isArray(singleJob.requirements),
      "Dynamic Route: job.$jobId.tsx",
      `Company: ${singleJob.company}, Match: ${singleJob.match}%`
    );

    // POST /api/jobs/save
    const saveJobRes = await fetch(`${BASE_URL}/jobs/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ jobId: "job_1" }),
    });
    const saveJobData = await saveJobRes.json();
    assert(saveJobRes.status === 200 && saveJobData.saved === true, "Bookmark Job Action (POST /api/jobs/save)");

    // GET /api/jobs/saved
    const savedJobsRes = await fetch(`${BASE_URL}/jobs/saved`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const savedJobsList = await savedJobsRes.json();
    assert(
      savedJobsRes.status === 200 && Array.isArray(savedJobsList) && savedJobsList.some((j) => j.id === "job_1"),
      "Saved Jobs List Retrieval (GET /api/jobs/saved)",
      `Saved count: ${savedJobsList.length}`
    );

    // DELETE /api/jobs/save/:jobId
    const deleteSavedJobRes = await fetch(`${BASE_URL}/jobs/save/job_1`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const deleteSavedData = await deleteSavedJobRes.json();
    assert(deleteSavedJobRes.status === 200 && deleteSavedData.saved === false, "Remove Bookmark Action (DELETE /api/jobs/save/:jobId)");

    // GET /api/jobs/company/:companyId
    const companyRes = await fetch(`${BASE_URL}/jobs/company/comp_techcorp`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const companyData = await companyRes.json();
    assert(
      companyRes.status === 200 && companyData.name === "TechCorp Global" && Array.isArray(companyData.open_roles),
      "Dynamic Route: company.$companyId.tsx",
      `Roles: ${companyData.open_roles?.length}, Rating: ${companyData.rating}`
    );

    // GET /api/jobs/salary-insights
    const salaryRes = await fetch(`${BASE_URL}/jobs/salary-insights`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const salaryData = await salaryRes.json();
    assert(
      salaryRes.status === 200 && salaryData.average > 100000 && Array.isArray(salaryData.percentiles),
      "Dynamic Route: salary-insights.tsx",
      `Role: ${salaryData.role}, Average: $${salaryData.average}`
    );

    // -------------------------------------------------------------------------
    // 4. DYNAMIC SKILL DETAILS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 4] Dynamic Skills Architecture");

    const skillRes = await fetch(`${BASE_URL}/skills/python-programming`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const skillData = await skillRes.json();
    assert(
      skillRes.status === 200 && skillData.name.toLowerCase().includes("python") && Array.isArray(skillData.recommendedCourses),
      "Dynamic Route: skills.$skillId.tsx",
      `Proficiency: ${skillData.progress}/100, Rank: ${skillData.rank}`
    );

    // -------------------------------------------------------------------------
    // 5. ADMIN ANALYTICS & REPORTS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 5] Admin Analytics, Reports & Exports");

    // GET /api/admin/analytics
    const adminAnalyticsRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAnalytics = await adminAnalyticsRes.json();
    assert(
      adminAnalyticsRes.status === 200 && adminAnalytics.totalUsers > 0 && adminAnalytics.totalJobs > 0,
      "Admin Analytics Dashboard Data",
      `Users: ${adminAnalytics.totalUsers}, Jobs: ${adminAnalytics.totalJobs}, Courses: ${adminAnalytics.totalCourses}`
    );

    // GET /api/admin/reports
    const reportsRes = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportsData = await reportsRes.json();
    assert(
      reportsRes.status === 200 && Array.isArray(reportsData.reports) && reportsData.reports.length >= 4,
      "Admin Reports Catalog Listing",
      `Reports count: ${reportsData.reports?.length}`
    );

    // GET /api/admin/reports/:reportId/download
    const downloadReportRes = await fetch(`${BASE_URL}/admin/reports/rep_growth_may/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const downloadReportData = await downloadReportRes.json();
    assert(
      downloadReportRes.status === 200 && downloadReportData.reportId === "rep_growth_may" && downloadReportData.metrics,
      "Admin Report Download File Generation"
    );

    // -------------------------------------------------------------------------
    // 6. CERTIFICATES & CREDENTIALS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 6] Certificates & Credential Sharing");

    const certsRes = await fetch(`${BASE_URL}/certificates`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const certsList = await certsRes.json();
    assert(certsRes.status === 200 && Array.isArray(certsList) && certsList.length > 0, "User Certificates List", `${certsList.length} credentials`);

    const certDownloadRes = await fetch(`${BASE_URL}/certificates/cert_ml_eng/download`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const certDownloadData = await certDownloadRes.json();
    assert(
      certDownloadRes.status === 200 && certDownloadData.certificateId === "cert_ml_eng",
      "Certificate Verification Download",
      `Status: ${certDownloadData.status}`
    );

    const certShareRes = await fetch(`${BASE_URL}/certificates/cert_ml_eng/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const certShareData = await certShareRes.json();
    assert(
      certShareRes.status === 200 && typeof certShareData.shareUrl === "string",
      "Certificate Shareable Link Generation",
      certShareData.shareUrl
    );

    // -------------------------------------------------------------------------
    // 7. SUBSCRIPTIONS & CONNECTED ACCOUNTS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 7] Subscriptions & Connected Accounts");

    const subRes = await fetch(`${BASE_URL}/subscriptions`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const subData = await subRes.json();
    assert(subRes.status === 200 && typeof subData.plan === "string", "Subscription Query", `Plan: ${subData.plan}`);

    const upgradeRes = await fetch(`${BASE_URL}/subscriptions/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ plan: "Enterprise" }),
    });
    const upgradeData = await upgradeRes.json();
    assert(upgradeRes.status === 200 && upgradeData.plan === "Enterprise", "Subscription Plan Upgrade", `Upgraded to: ${upgradeData.plan}`);

    const connRes = await fetch(`${BASE_URL}/auth/connected-accounts`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const connData = await connRes.json();
    assert(connRes.status === 200 && Array.isArray(connData) && connData.length >= 4, "Connected Accounts Query", `${connData.length} accounts`);

    const toggleConnRes = await fetch(`${BASE_URL}/auth/connected-accounts/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ provider: "GitHub" }),
    });
    const toggleConnData = await toggleConnRes.json();
    const githubAccount = toggleConnData.find((a: any) => a.name === "GitHub");
    assert(
      toggleConnRes.status === 200 && githubAccount !== undefined,
      "Toggle Connected Account State",
      `GitHub connected: ${githubAccount?.connected}`
    );

    // -------------------------------------------------------------------------
    // 8. ACCOUNT DELETION CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 8] Account Lifecycle & Deletion");

    const deleteAccountRes = await fetch(`${BASE_URL}/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const deleteAccountData = await deleteAccountRes.json();
    assert(deleteAccountRes.status === 200, "User Account Deletion", deleteAccountData.message);

  } catch (error: any) {
    console.error("Test execution fatal error:", error);
    failCount++;
  } finally {
    await adminCtx?.cleanup();
    await stopServer();
  }

  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULTS: ${passCount} PASSED / ${failCount} FAILED`);
  console.log("================================================================================");

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4Verification().catch((err) => {
  console.error("Uncaught error:", err);
  process.exit(1);
});
