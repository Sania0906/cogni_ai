import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { resolveTestAdminCredentials, type TestAdminContext } from "./testAdminHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.VERIFY_API_URL || "http://127.0.0.1:5000/api";
const ROOT_URL = BASE_URL.replace(/\/api$/, "");
const ML_URL = process.env.ML_ENGINE_URL || "http://127.0.0.1:8000";

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  detail: string;
}

const results: TestResult[] = [];
const latencies: Record<string, number> = {};

function record(category: string, name: string, passed: boolean, durationMs: number, detail: string) {
  results.push({ category, name, passed, durationMs, detail });
  const badge = passed ? "PASS" : "FAIL";
  console.log(`[${badge}] [${category}] ${name} (${durationMs}ms) -> ${detail}`);
}

async function timedFetch(url: string, options?: RequestInit) {
  const start = Date.now();
  const res = await fetch(url, options);
  const elapsed = Date.now() - start;
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, elapsed };
}

async function run() {
  console.log("=================================================================");
  console.log("COGNIFYAI PHASE 6 — LIVE END-TO-END & SECURITY VERIFICATION SUITE");
  console.log(`Express API: ${BASE_URL} | Python ML Engine: ${ML_URL}`);
  console.log("=================================================================\n");

  const ts = Date.now();
  const studentEmail = `p6_student_${ts}@cognifyai.test`;
  const recruiterEmail = `p6_recruiter_${ts}@cognifyai.test`;
  const testPass = "TestPass123!";
  let studentToken = "";
  let recruiterToken = "";
  let adminToken = "";
  let adminCtx: TestAdminContext | null = null;

  try {
  // -----------------------------------------------------------------------
  // 1. SUBSYSTEM HEALTH & ML READINESS
  // -----------------------------------------------------------------------
  try {
    const h1 = await timedFetch(`${ROOT_URL}/health`);
    latencies["express_health_ms"] = h1.elapsed;
    record("Health", "Express /health endpoint", h1.ok && h1.data?.status === "ok", h1.elapsed, `status=${h1.status}`);

    const h2 = await timedFetch(`${BASE_URL}/health`);
    record("Health", "Express /api/health endpoint", h2.ok && h2.data?.status === "ok", h2.elapsed, `port=${h2.data?.port}`);

    const mlH = await timedFetch(`${ML_URL}/health`);
    latencies["ml_health_ms"] = mlH.elapsed;
    const mlOk = mlH.ok && mlH.data?.models_loaded?.ats_scorer === true && mlH.data?.models_loaded?.career_classifier === true;
    record("Health", "FastAPI Python ML /health", mlOk, mlH.elapsed, `models=${JSON.stringify(mlH.data?.models_loaded)}`);

    const mlModels = await timedFetch(`${ML_URL}/models/status`);
    record(
      "Health",
      "ML Models artifacts loaded status",
      mlModels.ok && mlModels.data?.ats_scorer?.status === "loaded" && mlModels.data?.career_classifier?.status === "loaded",
      mlModels.elapsed,
      `arch=${mlModels.data?.career_classifier?.model_architecture || "N/A"}`
    );
  } catch (err: any) {
    record("Health", "Subsystem connectivity", false, 0, err.message);
  }

  // -----------------------------------------------------------------------
  // 2. SECURITY & AUTHENTICATION CONTROLS
  // -----------------------------------------------------------------------
  const unauthProfile = await timedFetch(`${BASE_URL}/auth/profile`);
  record("Security", "Reject unauthenticated /auth/profile (401)", unauthProfile.status === 401, unauthProfile.elapsed, `status=${unauthProfile.status}`);

  const badJwt = await timedFetch(`${BASE_URL}/auth/profile`, {
    headers: { Authorization: "Bearer malformed.jwt.token" },
  });
  record("Security", "Reject malformed Bearer JWT (401)", badJwt.status === 401, badJwt.elapsed, `status=${badJwt.status}`);

  const adminSignupAttempt = await timedFetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rogue Admin",
      email: `rogue_${ts}@cognifyai.test`,
      password: testPass,
      confirmPassword: testPass,
      role: "admin",
    }),
  });
  record(
    "Security",
    "Block public registration as role='admin' (403)",
    adminSignupAttempt.status === 403,
    adminSignupAttempt.elapsed,
    `status=${adminSignupAttempt.status}`
  );

  // Create Student & Recruiter Accounts
  const sSignup = await timedFetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase6 Student",
      email: studentEmail,
      password: testPass,
      confirmPassword: testPass,
      role: "user",
    }),
  });
  record("Auth", "Student registration (role='user')", sSignup.status === 201 && sSignup.data?.user?.role === "user", sSignup.elapsed, `status=${sSignup.status}`);

  const rSignup = await timedFetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase6 Recruiter Org",
      email: recruiterEmail,
      password: testPass,
      confirmPassword: testPass,
      role: "organization",
    }),
  });
  record("Auth", "Organization registration (role='organization')", rSignup.status === 201 && rSignup.data?.user?.role === "organization", rSignup.elapsed, `status=${rSignup.status}`);

  // Login all 3 roles
  const sLogin = await timedFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentEmail, password: testPass }),
  });
  studentToken = sLogin.data?.token || "";
  latencies["auth_login_ms"] = sLogin.elapsed;
  record("Auth", "Student login + DB trusted role='user'", sLogin.ok && Boolean(studentToken) && sLogin.data?.user?.role === "user", sLogin.elapsed, `role=${sLogin.data?.user?.role}`);

  const rLogin = await timedFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: recruiterEmail, password: testPass }),
  });
  recruiterToken = rLogin.data?.token || "";
  record("Auth", "Recruiter login + DB trusted role='organization'", rLogin.ok && Boolean(recruiterToken) && rLogin.data?.user?.role === "organization", rLogin.elapsed, `role=${rLogin.data?.user?.role}`);

  adminCtx = await resolveTestAdminCredentials();
  const aLogin = await timedFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminCtx.email, password: adminCtx.password }),
  });
  adminToken = aLogin.data?.token || "";
  record("Auth", "Admin login + DB trusted role='admin'", aLogin.ok && Boolean(adminToken) && aLogin.data?.user?.role === "admin", aLogin.elapsed, `role=${aLogin.data?.user?.role}`);

  // RBAC Isolation Checks
  const studentAdminBlock = await timedFetch(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record("Security", "Student blocked from /admin/analytics (403)", studentAdminBlock.status === 403, studentAdminBlock.elapsed, `status=${studentAdminBlock.status}`);

  const studentRecruiterBlock = await timedFetch(`${BASE_URL}/recruiter/candidates`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record("Security", "Student blocked from /recruiter/candidates (403)", studentRecruiterBlock.status === 403, studentRecruiterBlock.elapsed, `status=${studentRecruiterBlock.status}`);

  const recruiterAdminBlock = await timedFetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  record("Security", "Recruiter blocked from /admin/users (403)", recruiterAdminBlock.status === 403, recruiterAdminBlock.elapsed, `status=${recruiterAdminBlock.status}`);

  const recruiterCandidates = await timedFetch(`${BASE_URL}/recruiter/candidates`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const candidateRolesOk = Array.isArray(recruiterCandidates.data) && recruiterCandidates.data.every((c: any) => c.role === "user");
  record(
    "Security",
    "Recruiter candidate list isolated strictly to role='user'",
    recruiterCandidates.ok && candidateRolesOk,
    recruiterCandidates.elapsed,
    `count=${Array.isArray(recruiterCandidates.data) ? recruiterCandidates.data.length : "err"}, allUsers=${candidateRolesOk}`
  );

  // Admin Live Analytics Verification
  const adminAnalytics = await timedFetch(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  latencies["admin_analytics_ms"] = adminAnalytics.elapsed;
  record(
    "Admin",
    "Admin live DB analytics & ML online status",
    adminAnalytics.ok && adminAnalytics.data?.mlEngineOnline === true && typeof adminAnalytics.data?.totalUsers === "number" && adminAnalytics.data?.totalUsers >= 3,
    adminAnalytics.elapsed,
    `users=${adminAnalytics.data?.totalUsers}, mlOnline=${adminAnalytics.data?.mlEngineOnline}`
  );

  const adminReportDl = await timedFetch(`${BASE_URL}/admin/reports/rep_growth_summary/download`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record(
    "Admin",
    "Admin live report export (non-mock DB metrics)",
    adminReportDl.ok && typeof adminReportDl.data?.metrics?.registered_profiles === "number" && adminReportDl.data?.metrics?.registered_profiles < 10000,
    adminReportDl.elapsed,
    `profiles=${adminReportDl.data?.metrics?.registered_profiles}`
  );

  // -----------------------------------------------------------------------
  // 3. FILE UPLOAD SECURITY & EDGE-CASE ML VALIDATION
  // -----------------------------------------------------------------------
  const exeForm = new FormData();
  exeForm.append("resume", new Blob(["MZ_FAKE_BINARY"], { type: "application/x-msdownload" }), "malware.exe");
  const badExeUpload = await timedFetch(`${BASE_URL}/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: exeForm,
  });
  record("Security", "Reject .exe file on /resume/upload (400)", badExeUpload.status === 400, badExeUpload.elapsed, `msg=${badExeUpload.data?.message}`);

  const emptyForm = new FormData();
  emptyForm.append("file", new Blob(["hi"], { type: "text/plain" }), "tiny.txt");
  const emptyUpload = await timedFetch(`${BASE_URL}/ai/resume-optimize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: emptyForm,
  });
  record("Security", "Reject empty/tiny file on /ai/resume-optimize (400)", emptyUpload.status === 400, emptyUpload.elapsed, `msg=${emptyUpload.data?.message}`);

  // Strong Data Science / ML Resume via Mobile FormData field ("resume")
  const mlResumeContent = `
    PROFESSIONAL SUMMARY
    Machine Learning Engineer and Data Scientist with 4 years experience designing predictive models.
    EDUCATION
    Master of Science in Computer Science & Artificial Intelligence.
    EXPERIENCE
    Senior Data Scientist at DataLabs - Built production NLP pipelines in Python, PyTorch, Scikit-Learn, Pandas, NumPy, SQL, Docker, FastAPI, PostgreSQL.
    SKILLS
    Python, Machine Learning, Deep Learning, PyTorch, TensorFlow, Scikit-Learn, Pandas, NumPy, SQL, PostgreSQL, Docker, REST APIs.
    PROJECTS
    Deployed transformer ranking service handling 10k req/min.
  `;
  const mlForm = new FormData();
  mlForm.append("resume", new Blob([mlResumeContent], { type: "text/plain" }), "ml_candidate_cv.txt");
  mlForm.append("targetJob", "Data Scientist");

  const mlUploadRes = await timedFetch(`${BASE_URL}/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: mlForm,
  });
  latencies["ml_resume_upload_ats_ms"] = mlUploadRes.elapsed;
  record(
    "ML Engine",
    "Resume upload -> Real FastAPI ATS & Career inference",
    mlUploadRes.status === 201 &&
      mlUploadRes.data?.source === "ml_engine" &&
      mlUploadRes.data?.ats_score >= 55 &&
      Array.isArray(mlUploadRes.data?.detected_skills) &&
      mlUploadRes.data?.detected_skills.includes("Python"),
    mlUploadRes.elapsed,
    `source=${mlUploadRes.data?.source}, score=${mlUploadRes.data?.ats_score}, role=${mlUploadRes.data?.predicted_role}, skills=${mlUploadRes.data?.detected_skills?.length}`
  );

  // Domain discrimination direct ML test (Frontend vs Data Scientist)
  const feText = "Frontend Developer with 3 years React, TypeScript, JavaScript, HTML5, CSS3, TailwindCSS, Next.js UI design systems and Redux state management.";
  const feDirect = await timedFetch(`${ML_URL}/predict/ats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: feText, target_role: "Frontend Developer" }),
  });
  const feWrongRole = await timedFetch(`${ML_URL}/predict/ats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: feText, target_role: "DevOps Engineer" }),
  });
  latencies["ml_direct_ats_ms"] = feDirect.elapsed;
  record(
    "ML Engine",
    "ATS Domain Discrimination (Frontend CV matches Frontend > DevOps)",
    feDirect.ok && feWrongRole.ok && feDirect.data.ats_score > feWrongRole.data.ats_score,
    feDirect.elapsed + feWrongRole.elapsed,
    `FE=${feDirect.data?.ats_score} vs DevOps=${feWrongRole.data?.ats_score}`
  );

  const sparseCareer = await timedFetch(`${ML_URL}/predict/career`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: "Experienced Kubernetes Terraform AWS Docker Linux CI/CD DevOps Cloud Infrastructure engineer." }),
  });
  latencies["ml_direct_career_ms"] = sparseCareer.elapsed;
  record(
    "ML Engine",
    "Career Trajectory Classification (DevOps/Cloud CV)",
    sparseCareer.ok && ["DevOps Engineer", "Cloud Engineer"].includes(sparseCareer.data?.predicted_role),
    sparseCareer.elapsed,
    `predicted=${sparseCareer.data?.predicted_role}, conf=${sparseCareer.data?.confidence_percentage}%`
  );

  // -----------------------------------------------------------------------
  // 4. CROSS-PLATFORM SYNCHRONIZATION (Mobile API <-> PostgreSQL <-> Web API)
  // -----------------------------------------------------------------------
  // Resume history sync
  const resumeHistory = await timedFetch(`${BASE_URL}/resume/history`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record(
    "Sync",
    "Mobile Upload -> DB -> Web /resume/history consistency",
    resumeHistory.ok && Array.isArray(resumeHistory.data) && resumeHistory.data[0]?.file_name === "ml_candidate_cv.txt",
    resumeHistory.elapsed,
    `entries=${resumeHistory.data?.length}, score=${resumeHistory.data?.[0]?.ats_score}`
  );

  // Profile update sync
  const profilePut = await timedFetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Phase6 Verified Student",
      headline: "Applied ML Engineer",
      bio: "Cross-platform verified bio",
      degree: "B.Tech CS",
    }),
  });
  const profileGet = await timedFetch(`${BASE_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  latencies["profile_fetch_ms"] = profileGet.elapsed;
  record(
    "Sync",
    "Profile PUT -> DB -> Profile GET persistence",
    profilePut.ok && profileGet.ok && profileGet.data?.name === "Phase6 Verified Student" && profileGet.data?.headline === "Applied ML Engineer" && profileGet.data?.bio === "Cross-platform verified bio",
    profilePut.elapsed + profileGet.elapsed,
    `name='${profileGet.data?.name}', headline='${profileGet.data?.headline}'`
  );

  // Notifications create + read sync
  const notifsBefore = await timedFetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const firstNotifId = notifsBefore.data?.[0]?.id;
  let notifSyncOk = false;
  let notifElapsed = notifsBefore.elapsed;
  if (firstNotifId) {
    const markRead = await timedFetch(`${BASE_URL}/notifications/${firstNotifId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const notifsAfter = await timedFetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    notifElapsed += markRead.elapsed + notifsAfter.elapsed;
    const found = notifsAfter.data?.find((n: any) => n.id === firstNotifId);
    notifSyncOk = markRead.ok && found?.read === true;
  }
  record(
    "Sync",
    "Notifications auto-generated & mark-read synced in DB",
    Array.isArray(notifsBefore.data) && notifsBefore.data.length >= 2 && notifSyncOk,
    notifElapsed,
    `count=${notifsBefore.data?.length}, markReadSynced=${notifSyncOk}`
  );

  // Jobs bookmark + application persistence sync
  const saveJob = await timedFetch(`${BASE_URL}/jobs/save`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: "job_1" }),
  });
  const savedJobs = await timedFetch(`${BASE_URL}/jobs/saved`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const applyJob = await timedFetch(`${BASE_URL}/jobs/apply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: "job_2" }),
  });
  const appliedJobs = await timedFetch(`${BASE_URL}/jobs/applied`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const delSaved = await timedFetch(`${BASE_URL}/jobs/save/job_1`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record(
    "Sync",
    "Jobs Save, Unsave & Real DB Apply persistence",
    saveJob.ok &&
      savedJobs.data?.some((j: any) => j.id === "job_1") &&
      applyJob.status === 201 &&
      appliedJobs.data?.some((a: any) => a.id === "job_2" && a.status === "Applied") &&
      delSaved.ok,
    saveJob.elapsed + savedJobs.elapsed + applyJob.elapsed + appliedJobs.elapsed,
    `savedFound=${savedJobs.data?.length}, appliedFound=${appliedJobs.data?.length}`
  );

  // Course enroll & lesson completion progress sync
  const enroll = await timedFetch(`${BASE_URL}/courses/course_1/enroll`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const completeL1 = await timedFetch(`${BASE_URL}/courses/lesson/l1/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ courseId: "course_1" }),
  });
  const completeL2 = await timedFetch(`${BASE_URL}/courses/lesson/l2/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ courseId: "course_1" }),
  });
  const myCourses = await timedFetch(`${BASE_URL}/courses/my-courses`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const c1 = myCourses.data?.find((c: any) => c.courseId === "course_1");
  record(
    "Sync",
    "Course Enroll & Lesson Progress persistence (2/6 = 33%)",
    enroll.ok && completeL1.ok && completeL2.ok && c1?.completedLessons === 2 && c1?.progress === 33,
    enroll.elapsed + completeL1.elapsed + completeL2.elapsed + myCourses.elapsed,
    `completed=${c1?.completedLessons}, progress=${c1?.progress}%`
  );

  // Deterministic Interview Rubric Verification
  const weakEval = await timedFetch(`${BASE_URL}/ai/interview/evaluate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "s1", answers: ["Yes", "Okay"] }),
  });
  const strongAnswer =
    "Situation: At my previous internship our FastAPI ML microservice experienced p95 latency spikes above 850ms under 500 concurrent requests. Task: I was responsible for optimizing throughput and database query indexing. Action: I added PostgreSQL composite indexes, implemented Redis caching for identical embedding vectors, and batched Scikit-Learn inference workers using Docker. Result: We reduced p95 latency by 62% down to 310ms and increased system throughput by 3x.";
  const strongEval1 = await timedFetch(`${BASE_URL}/ai/interview/evaluate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "s2", answers: [strongAnswer] }),
  });
  const strongEval2 = await timedFetch(`${BASE_URL}/ai/interview/evaluate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "s3", answers: [strongAnswer] }),
  });
  const intHistory = await timedFetch(`${BASE_URL}/ai/interview/history`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record(
    "AI Rubric",
    "Deterministic Interview Rubric (Weak < 25, Strong >= 70, Reproducible, Persisted)",
    weakEval.ok &&
      weakEval.data?.score < 25 &&
      strongEval1.ok &&
      strongEval1.data?.score >= 70 &&
      strongEval1.data?.score === strongEval2.data?.score &&
      intHistory.ok &&
      intHistory.data?.length >= 3,
    weakEval.elapsed + strongEval1.elapsed + intHistory.elapsed,
    `weak=${weakEval.data?.score}, strong1=${strongEval1.data?.score}, strong2=${strongEval2.data?.score}, history=${intHistory.data?.length}`
  );

  // AI Career Twin & Company Readiness (ML-Powered)
  const careerTwin = await timedFetch(`${BASE_URL}/ai/career-twin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const compReadiness = await timedFetch(`${BASE_URL}/ai/company-readiness`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ companyName: "Google", targetRole: "Data Scientist" }),
  });
  record(
    "ML Engine",
    "AI Career Twin & Company Readiness powered by ML Engine",
    careerTwin.ok && careerTwin.data?.source === "ml_engine" && compReadiness.ok && compReadiness.data?.source === "ml_engine",
    careerTwin.elapsed + compReadiness.elapsed,
    `twinRole=${careerTwin.data?.predicted_role}, readiness=${compReadiness.data?.readinessScore}%`
  );

  // Subscription persistence
  const subUpgrade = await timedFetch(`${BASE_URL}/subscriptions/upgrade`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "Enterprise" }),
  });
  const subGet = await timedFetch(`${BASE_URL}/subscriptions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  record(
    "Sync",
    "Subscription Tier Simulation DB persistence",
    subUpgrade.ok && subGet.ok && subGet.data?.plan === "Enterprise",
    subUpgrade.elapsed + subGet.elapsed,
    `plan=${subGet.data?.plan}`
  );

  // Recruiter ML-ranked candidate query for student profile
  const mlCandidateQuery = await timedFetch(`${BASE_URL}/recruiter/candidates?role=Data+Scientist`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const foundStudent = Array.isArray(mlCandidateQuery.data)
    ? mlCandidateQuery.data.find((c: any) => c.email === studentEmail)
    : null;
  record(
    "Recruiter",
    "Recruiter ML-ranked search sees Student's updated ATS & skills",
    mlCandidateQuery.ok && Boolean(foundStudent) && foundStudent.ats_score >= 50,
    mlCandidateQuery.elapsed,
    `found=${Boolean(foundStudent)}, score=${foundStudent?.ats_score}, skills=${foundStudent?.skills?.slice(0, 4).join(",")}`
  );

  // -----------------------------------------------------------------------
  // 5. TEARDOWN TEST ACCOUNTS (Keeps Production DB Clean)
  // -----------------------------------------------------------------------
  const delStudent = await timedFetch(`${BASE_URL}/auth/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const delRecruiter = await timedFetch(`${BASE_URL}/auth/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  record(
    "Cleanup",
    "Delete temporary Phase 6 test accounts cleanly",
    delStudent.ok && delRecruiter.ok,
    delStudent.elapsed + delRecruiter.elapsed,
    `student=${delStudent.status}, recruiter=${delRecruiter.status}`
  );
  } finally {
    await adminCtx?.cleanup();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  console.log("\n=================================================================");
  console.log(`PHASE 6 RESULTS: ${passedCount}/${results.length} PASSED (${failedCount} FAILED)`);
  console.log("Measured Latencies (ms):", JSON.stringify(latencies));
  console.log("=================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal Phase 6 Verification Error:", err);
  process.exit(1);
});

