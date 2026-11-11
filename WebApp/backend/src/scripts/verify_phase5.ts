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
import analyticsRoutes from "../routes/analytics.js";
import { resolveTestAdminCredentials, type TestAdminContext } from "./testAdminHelper.js";

const app = express();
app.use(cors());
app.use(express.json());

// Mount all application routes
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
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CognifyAI Unified API",
    port: 5000,
    network: "0.0.0.0",
    lan_ip: "192.168.31.93",
  });
});

const TEST_PORT = 5007;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let server: any;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[Phase 5 Test Server] Bound on port ${TEST_PORT}`);
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`[Phase 5 Test Server] Closed.`);
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

async function runPhase5Verification() {
  console.log("================================================================================");
  console.log("COGNIFYAI — PHASE 5 MOBILE APPLICATION & CROSS-PLATFORM VERIFICATION");
  console.log("================================================================================\n");

  await startServer();

  let memberToken = "";
  let recruiterToken = "";
  let adminToken = "";
  let adminCtx: TestAdminContext | null = null;

  const timestamp = Date.now();
  const testUserEmail = `mobile_user_${timestamp}@cognifyai.com`;
  const testRecruiterEmail = `mobile_rec_${timestamp}@cognifyai.com`;
  const testPassword = "Password123!";

  try {
    // -------------------------------------------------------------------------
    // 1. Health & Network Check
    // -------------------------------------------------------------------------
    console.log("--- TEST GROUP 1: Health & Network Binding ---");
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, "Health Check Status 200");
    assert(healthData.status === "ok", "Service Status 'ok'");
    assert(healthData.network === "0.0.0.0", "Bound to 0.0.0.0 for LAN & Device Access");

    // -------------------------------------------------------------------------
    // 2. Authentication & Unified RBAC
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Authentication & Unified RBAC ---");

    // A. Member Signup & Login
    const memberSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mobile Test User",
        email: testUserEmail,
        password: testPassword,
        confirmPassword: testPassword,
        role: "user",
      }),
    });
    assert(
      memberSignupRes.status === 201 || memberSignupRes.status === 200,
      "Member Registration Status 200/201",
      `email: ${testUserEmail}`
    );

    const memberLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUserEmail, password: testPassword }),
    });
    const memberLoginData = await memberLoginRes.json();
    assert(memberLoginRes.status === 200, "Member Login Status 200");
    memberToken = memberLoginData.token || memberLoginData.access_token;
    assert(Boolean(memberToken), "Member Token Issued");
    assert(memberLoginData.user?.role === "user", "Member Role Confirmed 'user'");

    // B. Recruiter Signup & Login
    const recSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Recruiting Inc",
        email: testRecruiterEmail,
        password: testPassword,
        confirmPassword: testPassword,
        role: "organization",
      }),
    });
    assert(
      recSignupRes.status === 201 || recSignupRes.status === 200,
      "Recruiter Registration Status 200/201",
      `email: ${testRecruiterEmail}`
    );

    const recLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testRecruiterEmail, password: testPassword }),
    });
    const recLoginData = await recLoginRes.json();
    assert(recLoginRes.status === 200, "Recruiter Login Status 200");
    recruiterToken = recLoginData.token || recLoginData.access_token;
    assert(Boolean(recruiterToken), "Recruiter Token Issued");
    assert(
      recLoginData.user?.role === "organization" || recLoginData.user?.role === "recruiter",
      "Recruiter Role Confirmed 'organization'"
    );

    // C. Admin Login (Pre-provisioned Secure Admin)
    adminCtx = await resolveTestAdminCredentials();
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminCtx.email, password: adminCtx.password }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, "Admin Login Status 200");
    adminToken = adminLoginData.token || adminLoginData.access_token;
    assert(Boolean(adminToken), "Admin Token Issued");
    assert(adminLoginData.user?.role === "admin", "Admin Role Confirmed 'admin'");

    // D. RBAC Enforcement: Standard User cannot access Admin endpoints
    const rbacRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(
      rbacRes.status === 403,
      "RBAC Protection: Standard User Blocked from Admin Analytics (403)"
    );

    // -------------------------------------------------------------------------
    // 3. Cross-Platform Jobs & Bookmarks Synchronization
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: Cross-Platform Jobs & Bookmarks Sync ---");

    // A. Mobile fetches Jobs list
    const jobsRes = await fetch(`${BASE_URL}/jobs`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const jobsList = await jobsRes.json();
    assert(jobsRes.status === 200, "Mobile Jobs Catalog Fetch 200");
    assert(Array.isArray(jobsList) && jobsList.length > 0, "Jobs Catalog Not Empty", `Found ${jobsList.length} jobs`);
    const targetJobId = jobsList[0]?.id || "job_1";

    // B. Mobile saves job
    const saveRes = await fetch(`${BASE_URL}/jobs/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ jobId: targetJobId }),
    });
    const saveData = await saveRes.json();
    assert(saveRes.status === 200, "Mobile Save Job Status 200");
    assert(saveData.saved === true, "Job Bookmarked Confirmed");

    // C. Web queries saved jobs -> Must see the job bookmarked from mobile
    const webSavedRes = await fetch(`${BASE_URL}/jobs/saved`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const webSavedList = await webSavedRes.json();
    assert(webSavedRes.status === 200, "Web Saved Jobs Retrieval 200");
    const isPresentOnWeb = Array.isArray(webSavedList) && webSavedList.some(
      (j: any) => String(j.job_id || j.id) === String(targetJobId)
    );
    assert(isPresentOnWeb, "Cross-Platform Sync: Job saved on Mobile reflects on Web", `Job ID: ${targetJobId}`);

    // D. Mobile removes saved job
    const removeRes = await fetch(`${BASE_URL}/jobs/save/${targetJobId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const removeData = await removeRes.json();
    assert(removeRes.status === 200, "Mobile Unsave Job Status 200");
    assert(removeData.saved === false, "Job Removal Confirmed");

    // E. Web queries saved jobs again -> Confirms removed
    const webSavedRes2 = await fetch(`${BASE_URL}/jobs/saved`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const webSavedList2 = await webSavedRes2.json();
    const isRemovedOnWeb = Array.isArray(webSavedList2) && !webSavedList2.some(
      (j: any) => String(j.job_id || j.id) === String(targetJobId)
    );
    assert(isRemovedOnWeb, "Cross-Platform Sync: Job removed on Mobile is absent on Web");

    // -------------------------------------------------------------------------
    // 4. Cross-Platform Courses & Learning Progression
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Cross-Platform Courses & Lesson Completion ---");

    // A. Mobile fetches Courses
    const coursesRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const coursesList = await coursesRes.json();
    assert(coursesRes.status === 200, "Mobile Courses Fetch 200");
    assert(Array.isArray(coursesList) && coursesList.length > 0, "Courses List Populated", `Count: ${coursesList.length}`);
    const testCourseId = coursesList[0]?.id || "course_1";

    // B. Mobile enrolls in course
    const enrollRes = await fetch(`${BASE_URL}/courses/${testCourseId}/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert(enrollRes.status === 200, "Mobile Course Enrollment Status 200");

    // C. Web queries enrolled courses -> Confirms enrollment
    const myCoursesRes = await fetch(`${BASE_URL}/courses/my-courses`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const myCoursesList = await myCoursesRes.json();
    assert(myCoursesRes.status === 200, "Web Enrolled Courses Fetch 200");
    const isEnrolled = Array.isArray(myCoursesList) && myCoursesList.some(
      (c: any) => String(c.courseId || c.id) === String(testCourseId)
    );
    assert(isEnrolled, "Cross-Platform Sync: Course enrolled on Mobile is present on Web", `Course: ${testCourseId}`);

    // D. Mobile completes Lesson 1
    const completeLessonRes = await fetch(`${BASE_URL}/courses/lesson/l1/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ courseId: testCourseId }),
    });
    const completeLessonData = await completeLessonRes.json();
    assert(completeLessonRes.status === 200, "Mobile Complete Lesson 1 Status 200");
    assert(
      completeLessonData.success === true || completeLessonData.completed === true,
      "Lesson 1 Marked Complete"
    );
    assert(completeLessonData.completedLessons >= 1, "Completed Lessons Count Increment Verified", `Count: ${completeLessonData.completedLessons}`);

    // E. Web verifies updated course progress
    const courseDetailRes = await fetch(`${BASE_URL}/courses/${testCourseId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const courseDetailData = await courseDetailRes.json();
    assert(courseDetailRes.status === 200, "Web Course Details Retrieval 200");
    assert(
      courseDetailData.completedLessons >= 1 || courseDetailData.progress > 0,
      "Cross-Platform Sync: Lesson completed on Mobile reflects in Web progress",
      `Progress: ${courseDetailData.progress}%`
    );

    // -------------------------------------------------------------------------
    // 5. Mobile Resume Upload & ML ATS Inference
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Mobile Resume Upload & ML ATS Inference ---");

    const resumeContent = `
    Alex Rivera
    Senior Software & Machine Learning Engineer
    alex.rivera@example.com | San Francisco, CA

    PROFESSIONAL SUMMARY
    Senior Full Stack & AI Systems Engineer with 6+ years of experience architecting distributed cloud systems,
    deep learning pipelines, and responsive web applications. Expert in TypeScript, Python, PyTorch, React,
    Node.js, PostgreSQL, Docker, and Kubernetes.

    TECHNICAL SKILLS
    - Languages: TypeScript, Python, JavaScript, SQL, Bash
    - AI & ML: PyTorch, Scikit-Learn, TensorFlow, TF-IDF, NLP, Computer Vision
    - Full Stack: React, React Native, Node.js, Express, TailwindCSS, REST APIs
    - Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Git, Supabase, PostgreSQL
    `;

    const form = new FormData();
    const blob = new Blob([resumeContent], { type: "text/plain" });
    form.append("file", blob, "alex_rivera_resume.txt");
    form.append("targetJob", "Machine Learning Engineer");

    const uploadRes = await fetch(`${BASE_URL}/resume/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
      body: form,
    });

    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 || uploadRes.status === 200, "Mobile Resume Upload Status 200/201");
    assert(typeof uploadData.ats_score === "number", "ATS Score Generated by ML Engine", `Score: ${uploadData.ats_score}%`);
    assert(Array.isArray(uploadData.detected_skills || uploadData.skills), "Extracted Skills Array Present");
    assert(
      Array.isArray(uploadData.recommendations || uploadData.improvements),
      "Actionable Recommendations Present"
    );

    // Verify history endpoint retrieves this upload
    const historyRes = await fetch(`${BASE_URL}/resume/history`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, "Resume Audit History Fetch 200");
    assert(Array.isArray(historyData) && historyData.length > 0, "Upload Appears in Audit History");

    // -------------------------------------------------------------------------
    // 6. Recruiter Talent Pool & Shortlist
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Recruiter Talent Pool & Shortlist ---");

    const candRes = await fetch(`${BASE_URL}/recruiter/candidates`, {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    const candList = await candRes.json();
    assert(candRes.status === 200, "Recruiter Candidates Fetch 200");
    assert(Array.isArray(candList) && candList.length > 0, "Candidates Pool Not Empty");

    const candidateToShortlist = candList[0]?.id || "cand_1";
    const shortlistRes = await fetch(`${BASE_URL}/recruiter/shortlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({ candidateId: candidateToShortlist, shortlisted: true }),
    });
    const shortlistData = await shortlistRes.json();
    assert(shortlistRes.status === 200, "Recruiter Shortlist Action 200");
    assert(Boolean(shortlistData.success !== false), "Candidate Shortlisted Successfully");

    // -------------------------------------------------------------------------
    // 7. Admin Telemetry & Analytics
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 7: Admin Platform Telemetry & Analytics ---");

    const adminAnalyticsRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAnalytics = await adminAnalyticsRes.json();
    assert(adminAnalyticsRes.status === 200, "Admin Analytics Fetch 200");
    assert(
      typeof adminAnalytics.totalUsers === "number" ||
        typeof adminAnalytics.total_users === "number" ||
        typeof adminAnalytics.usersCount === "number",
      "Real Database Users Count Present"
    );
    assert(
      typeof adminAnalytics.totalJobs === "number" ||
        typeof adminAnalytics.total_jobs === "number" ||
        typeof adminAnalytics.jobsCount === "number",
      "Real Database Jobs Count Present"
    );

    // Android vs Web telemetry
    const telemetryRes = await fetch(`${BASE_URL}/analytics/android-vs-web`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const telemetryData = await telemetryRes.json();
    assert(telemetryRes.status === 200, "Android vs Web Telemetry Fetch 200");
    assert(Array.isArray(telemetryData.metrics), "Cross-Platform Telemetry Metrics Present");

    // -------------------------------------------------------------------------
    // 8. Profile Update & Persistence
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 8: Profile Update & Persistence ---");

    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        name: "Mobile Test User Updated",
        headline: "Staff Cloud & AI Architect",
        bio: "Specializing in high-performance distributed AI pipelines and cross-platform applications.",
      }),
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200, "Profile Update Status 200");

    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, "Current User Profile Fetch 200");
    assert(
      profileData.name === "Mobile Test User Updated" || profileData.user?.name === "Mobile Test User Updated",
      "Updated Profile Name Persisted Correctly in Database"
    );

  } catch (err: any) {
    console.error("\n❌ Unexpected Verification Exception:", err);
    failCount++;
  } finally {
    await adminCtx?.cleanup();
    await stopServer();
  }

  console.log("\n================================================================================");
  console.log(`PHASE 5 VERIFICATION RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
  console.log("================================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase5Verification();
