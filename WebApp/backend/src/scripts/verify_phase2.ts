import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import authRoutes from "../routes/auth.js";
import skillsRoutes from "../routes/skills.js";
import skillRoutes from "../routes/skill.js";
import aiRoutes from "../routes/ai.js";
import recruiterRoutes from "../routes/recruiter.js";
import adminRoutes from "../routes/admin.js";
import resumeRoutes from "../routes/resume.js";
import { resolveTestAdminCredentials, type TestAdminContext } from "./testAdminHelper.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/skill", skillRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/resume", resumeRoutes);

const TEST_PORT = 5005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let server: any;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`[Test Server] Closed.`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon}: ${name} - ${details}`);
}

async function runTests() {
  await startServer();

  const timestamp = Date.now();
  const testUserEmail = `user.test.${timestamp}@cognifyai.com`;
  const testOrgEmail = `org.test.${timestamp}@cognifyai.com`;
  const testPassword = "Password123!";

  let userToken = "";
  let orgToken = "";
  let adminToken = "";
  let adminCtx: TestAdminContext | null = null;

  try {
    // -----------------------------------------------------------------
    // 1. User Signup
    // -----------------------------------------------------------------
    console.log("\n--- TEST 1: User Signup ---");
    const res1 = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Regular User",
        email: testUserEmail,
        password: testPassword,
        role: "user",
      }),
    });
    const data1 = await res1.json();
    record(
      "User Signup (role: 'user')",
      res1.status === 201 && data1.user?.role === "user",
      `Status: ${res1.status}, Assigned Role: ${data1.user?.role}`
    );

    // -----------------------------------------------------------------
    // 2. User Login
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: User Login ---");
    const res2 = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUserEmail, password: testPassword }),
    });
    const data2 = await res2.json();
    userToken = data2.token || data2.access_token;
    record(
      "User Login (token & DB role)",
      res2.status === 200 && !!userToken && data2.user?.role === "user",
      `Status: ${res2.status}, User ID: ${data2.user?.id}, Role: ${data2.user?.role}`
    );

    // -----------------------------------------------------------------
    // 3. Organization Signup
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Organization Signup ---");
    const res3 = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Talent Corp",
        email: testOrgEmail,
        password: testPassword,
        role: "organization",
      }),
    });
    const data3 = await res3.json();
    record(
      "Organization Signup (role: 'organization')",
      res3.status === 201 && data3.user?.role === "organization",
      `Status: ${res3.status}, Assigned Role: ${data3.user?.role}`
    );

    // -----------------------------------------------------------------
    // 4. Organization Login
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Organization Login ---");
    const res4 = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testOrgEmail, password: testPassword }),
    });
    const data4 = await res4.json();
    orgToken = data4.token || data4.access_token;
    record(
      "Organization Login (token & DB role)",
      res4.status === 200 && !!orgToken && data4.user?.role === "organization",
      `Status: ${res4.status}, Role: ${data4.user?.role}`
    );

    // -----------------------------------------------------------------
    // 5. Admin Self-Assignment Rejection
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Public Admin Signup Rejection ---");
    const res5 = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Attempting Admin",
        email: `fakeadmin.${timestamp}@cognifyai.com`,
        password: testPassword,
        role: "admin",
      }),
    });
    const data5 = await res5.json();
    record(
      "Public Admin Signup Rejection (HTTP 403 Forbidden)",
      res5.status === 403,
      `Status: ${res5.status}, Message: ${data5.message}`
    );

    // -----------------------------------------------------------------
    // 6. Admin Login with Provisioned Account
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Admin Login (Provisioned Account) ---");
    adminCtx = await resolveTestAdminCredentials();
    const res6 = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminCtx.email,
        password: adminCtx.password,
      }),
    });
    const data6 = await res6.json();
    adminToken = data6.token || data6.access_token;
    record(
      "Admin Login (Secure Provisioned Account)",
      res6.status === 200 && !!adminToken && data6.user?.role === "admin",
      `Status: ${res6.status}, Authenticated Role: ${data6.user?.role}`
    );

    // -----------------------------------------------------------------
    // 7. Unauthorized Admin Access Rejection
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Unauthorized Admin Access Rejection ---");
    const res7 = await fetch(`${BASE_URL}/admin/users`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data7 = await res7.json();
    record(
      "Unauthorized Regular User Admin Access Rejection",
      res7.status === 403,
      `Status: ${res7.status}, Error Message: ${data7.message}`
    );

    // -----------------------------------------------------------------
    // 8. Authorized Admin Access
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: Authorized Admin Endpoint Access ---");
    const res8 = await fetch(`${BASE_URL}/admin/users`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data8 = await res8.json();
    record(
      "Authorized Admin Access (GET /api/admin/users)",
      res8.status === 200 && Array.isArray(data8),
      `Status: ${res8.status}, Total Users Returned: ${data8?.length}`
    );

    // -----------------------------------------------------------------
    // 9. Profile Retrieval
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: Profile Retrieval ---");
    const res9 = await fetch(`${BASE_URL}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data9 = await res9.json();
    record(
      "Profile Retrieval (GET /api/auth/profile)",
      res9.status === 200 && data9.email === testUserEmail,
      `Status: ${res9.status}, Name: ${data9.name}, Role: ${data9.role}`
    );

    // -----------------------------------------------------------------
    // 10. Resume Upload via FormData ("file" field)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: Resume Upload ('file' field) ---");
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const resumeTextContent = "Senior Software Engineer with extensive experience in React, Node.js, TypeScript, PostgreSQL, and AWS systems.";
    const bodyWithFile = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="targetJob"',
      "",
      "Full Stack Engineer",
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="sample_resume.txt"',
      "Content-Type: text/plain",
      "",
      resumeTextContent,
      `--${boundary}--`,
    ].join("\r\n");

    const res10 = await fetch(`${BASE_URL}/resume/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyWithFile,
    });
    const data10 = await res10.json();
    record(
      "Resume Upload (field 'file')",
      res10.status === 201 && typeof data10.ats_score === "number" && Array.isArray(data10.detected_skills),
      `Status: ${res10.status}, ATS Score: ${data10.ats_score}, Skills: ${data10.detected_skills?.slice(0, 3).join(", ")}`
    );

    // -----------------------------------------------------------------
    // 11. Resume Upload via FormData ("resume" field - Mobile compatibility)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: Resume Upload ('resume' field) ---");
    const boundary2 = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const bodyWithResume = [
      `--${boundary2}`,
      'Content-Disposition: form-data; name="targetJob"',
      "",
      "Machine Learning Engineer",
      `--${boundary2}`,
      'Content-Disposition: form-data; name="resume"; filename="mobile_resume.txt"',
      "Content-Type: text/plain",
      "",
      "Machine Learning Engineer proficient in Python, PyTorch, Scikit-Learn, Docker, and SQL.",
      `--${boundary2}--`,
    ].join("\r\n");

    const res11 = await fetch(`${BASE_URL}/resume/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary2}`,
      },
      body: bodyWithResume,
    });
    const data11 = await res11.json();
    record(
      "Resume Upload (field 'resume' Mobile compatibility)",
      res11.status === 201 && typeof data11.score === "number",
      `Status: ${res11.status}, Score: ${data11.score}, Detected: ${data11.detected_skills?.slice(0, 3).join(", ")}`
    );

    // -----------------------------------------------------------------
    // 12. Skill Gap Response
    // -----------------------------------------------------------------
    console.log("\n--- TEST 12: Skill Gap Analysis ---");
    const res12 = await fetch(`${BASE_URL}/skills/gap`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data12 = await res12.json();
    record(
      "Skill Gap Analysis (GET /api/skills/gap)",
      res12.status === 200 && Array.isArray(data12.skills) && typeof data12.matchPercentage === "number",
      `Status: ${res12.status}, Target Role: ${data12.targetRole}, Match: ${data12.matchPercentage}%, Skills Count: ${data12.skills?.length}`
    );

    // -----------------------------------------------------------------
    // 13. Learning Roadmap Response
    // -----------------------------------------------------------------
    console.log("\n--- TEST 13: Learning Roadmap (Nodes + Milestones) ---");
    const res13 = await fetch(`${BASE_URL}/ai/roadmap/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company: "Google", role: "Staff Engineer" }),
    });
    const data13 = await res13.json();

    const res13b = await fetch(`${BASE_URL}/ai/roadmap/latest`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data13b = await res13b.json();
    record(
      "Learning Roadmap (Web 'nodes' + Mobile 'milestones')",
      res13b.status === 200 && Array.isArray(data13b.nodes) && Array.isArray(data13b.milestones),
      `Status: ${res13b.status}, Nodes: ${data13b.nodes?.length}, Milestones: ${data13b.milestones?.length}`
    );

    // -----------------------------------------------------------------
    // 14. Career Twin Response
    // -----------------------------------------------------------------
    console.log("\n--- TEST 14: Career Twin (Archetype + Summary) ---");
    const res14 = await fetch(`${BASE_URL}/ai/career-twin/latest`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data14 = await res14.json();
    record(
      "Career Twin (Web 'personality' + Mobile 'archetype' & 'summary')",
      res14.status === 200 && !!(data14.archetype || data14.personality) && !!(data14.summary || data14.description),
      `Status: ${res14.status}, Archetype: ${data14.archetype}, Summary: ${data14.summary?.substring(0, 40)}...`
    );

    // -----------------------------------------------------------------
    // 15. Company Readiness Response
    // -----------------------------------------------------------------
    console.log("\n--- TEST 15: Company Readiness ---");
    const res15 = await fetch(`${BASE_URL}/ai/company-readiness`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Microsoft",
        targetRole: "Cloud Architect",
      }),
    });
    const data15 = await res15.json();
    record(
      "Company Readiness (Web 'readiness_score' + Mobile 'readinessScore' & 'summary')",
      res15.status === 200 && typeof data15.readinessScore === "number" && !!data15.summary,
      `Status: ${res15.status}, Readiness Score: ${data15.readinessScore}%, Summary: ${data15.summary?.substring(0, 40)}...`
    );

    // -----------------------------------------------------------------
    // 16. Recruiter Candidate Pool Access
    // -----------------------------------------------------------------
    console.log("\n--- TEST 16: Recruiter Candidate Pool Access ---");
    const res16 = await fetch(`${BASE_URL}/recruiter/candidates`, {
      method: "GET",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const data16 = await res16.json();
    const candidateSample = data16?.[0];
    record(
      "Recruiter Candidates (Authorized Organization)",
      res16.status === 200 && Array.isArray(data16),
      `Status: ${res16.status}, Candidates Count: ${data16?.length}, Sample target_role: ${candidateSample?.target_role}, match_score: ${candidateSample?.match_score}`
    );

    // -----------------------------------------------------------------
    // 17. Recruiter Access Rejection for Regular User
    // -----------------------------------------------------------------
    console.log("\n--- TEST 17: Recruiter Access Rejection for Regular User ---");
    const res17 = await fetch(`${BASE_URL}/recruiter/candidates`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    record(
      "Recruiter Access Rejection (Regular User HTTP 403 Forbidden)",
      res17.status === 403,
      `Status: ${res17.status}`
    );

    // -----------------------------------------------------------------
    // 18. Mobile API Connectivity Configuration
    // -----------------------------------------------------------------
    console.log("\n--- TEST 18: Mobile API Connectivity Configuration ---");
    const mobileEnvPath = path.resolve(__dirname, "../../../../MobileApp/.env");
    const envExists = fs.existsSync(mobileEnvPath);
    const envContent = envExists ? fs.readFileSync(mobileEnvPath, "utf-8") : "";
    const hasExpoUrl = envContent.includes("EXPO_PUBLIC_API_URL=http://192.168.31.93:5000/api");
    record(
      "Mobile App Configuration (EXPO_PUBLIC_API_URL pointing to LAN IP)",
      envExists && hasExpoUrl,
      `File exists: ${envExists}, Correct LAN URL: ${hasExpoUrl}`
    );

  } catch (err: any) {
    console.error("Test Suite Runtime Error:", err);
  } finally {
    await adminCtx?.cleanup();
    await stopServer();
  }

  console.log("\n=======================================================");
  console.log("            PHASE 2 TEST SUITE SUMMARY");
  console.log("=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  if (passedCount === totalCount) {
    console.log("STATUS: ALL TESTS PASSED SUCCESSFULLY! 🚀");
  } else {
    console.log("STATUS: SOME TESTS FAILED.");
  }
  console.log("=======================================================");
}

runTests();

