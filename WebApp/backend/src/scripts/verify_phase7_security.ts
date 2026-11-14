/**
 * CognifyAI Phase 7.3 — Offline Security & Deployment Blocker Verification Suite
 *
 * Runs 100% locally without touching live Supabase, Render, or Expo services:
 * - Intercepts Supabase REST/Auth fetches on a mock host so zero external network calls occur.
 * - Exercises real Express routes, auth/role middleware, and rate limiters in-process via HTTP streams.
 * - Validates ML fail-closed checks, admin provisioning strictness, dev script prod guards,
 *   Render Blueprint YAML validity, Migration 015 SQL hardening invariants, and MobileApp API config.
 */

import fs from "fs";
import path from "path";
import http from "http";
import { PassThrough, Writable } from "stream";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");

// Configure isolated mock Supabase credentials BEFORE dynamically importing backend modules
const MOCK_SUPABASE_ORIGIN = "https://mock-local.supabase.test";
const MOCK_ML_ORIGIN = "http://mock-ml.local";
const EXPECTED_ML_TEST_SECRET = "expected-ml-test-secret";
process.env.SUPABASE_URL = MOCK_SUPABASE_ORIGIN;
process.env.SUPABASE_ANON_KEY = "mock-anon-key-phase73";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key-phase73";
process.env.NODE_ENV = "production";
process.env.ML_SERVICE_SECRET = "";

interface MockUserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  metadataRole: string;
}

const mockUsersByEmail = new Map<string, MockUserRecord>();
const mockUsersByToken = new Map<string, MockUserRecord>();
const mockProfilesById = new Map<string, Record<string, any>>();
const recordedProfileUpdates: Array<{ userId: string; body: Record<string, any> }> = [];
const recordedSignupRoles: string[] = [];
const recordedMlSecretHeaders: Array<string | null> = [];

const originalFetch = globalThis.fetch.bind(globalThis);

function jsonResponse(body: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

// Intercept only mock-local.supabase.test & mock-ml.local traffic; pass localhost Express test requests through
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (urlStr.startsWith(MOCK_ML_ORIGIN)) {
    const mlParsed = new URL(urlStr);
    const reqHeaders = new Headers(init?.headers || {});
    const providedSecret = reqHeaders.get("x-ml-service-secret");
    recordedMlSecretHeaders.push(providedSecret);

    if (mlParsed.pathname === "/health") {
      return jsonResponse({
        status: "healthy",
        ready: true,
        models_loaded: { ats_scorer: true, career_classifier: true },
      });
    }

    if (!providedSecret || providedSecret !== EXPECTED_ML_TEST_SECRET) {
      return jsonResponse({ detail: "Invalid or missing ML service authentication credential." }, 401);
    }

    if (mlParsed.pathname === "/predict/ats") {
      return jsonResponse({
        ats_score: 88.5,
        target_role: "Python Developer",
        score_breakdown: {
          skill_coverage_score: 85,
          semantic_similarity_score: 90,
          section_completeness_score: 90,
          raw_cosine_similarity: 0.9,
          raw_skill_coverage_pct: 85,
          raw_section_completeness_pct: 90,
        },
        matched_skills: ["Python", "FastAPI", "Docker"],
        missing_required_skills: [],
        additional_skills: ["React"],
        all_extracted_skills: ["Python", "FastAPI", "Docker", "React"],
        sections_detected: { summary: true, skills: true, experience: true, education: true },
        actionable_recommendations: [],
      });
    }

    return jsonResponse({ detail: "Unhandled mock ML route" }, 404);
  }

  if (!urlStr.startsWith(MOCK_SUPABASE_ORIGIN)) {
    return originalFetch(input, init);
  }

  const parsed = new URL(urlStr);
  const method = (init?.method || "GET").toUpperCase();
  let parsedBody: any = {};
  if (typeof init?.body === "string" && init.body.trim()) {
    try {
      parsedBody = JSON.parse(init.body);
    } catch {
      parsedBody = {};
    }
  }

  // Supabase Auth: admin.createUser
  if (parsed.pathname === "/auth/v1/admin/users" && method === "POST") {
    const email = String(parsedBody.email || "").toLowerCase().trim();
    const metaRole = String(parsedBody.user_metadata?.role || "user").toLowerCase();
    const safeRole = metaRole === "organization" || metaRole === "recruiter" ? "organization" : "user";
    recordedSignupRoles.push(safeRole);
    const id = `00000000-0000-4000-8000-${String(mockUsersByEmail.size + 1).padStart(12, "0")}`;
    const user: MockUserRecord = {
      id,
      email,
      password: String(parsedBody.password || ""),
      name: String(parsedBody.user_metadata?.name || email.split("@")[0]),
      role: safeRole,
      metadataRole: safeRole,
    };
    mockUsersByEmail.set(email, user);
    mockProfilesById.set(id, { id, name: user.name, email, role: safeRole });
    return jsonResponse({
      id,
      email,
      user_metadata: { name: user.name, role: safeRole },
    });
  }

  // Supabase Auth: signInWithPassword
  if (parsed.pathname === "/auth/v1/token" && method === "POST") {
    const email = String(parsedBody.email || "").toLowerCase().trim();
    const password = String(parsedBody.password || "");
    const user = mockUsersByEmail.get(email);
    if (!user || user.password !== password) {
      return jsonResponse({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
    }
    const token = `mock-jwt-${user.id}`;
    mockUsersByToken.set(token, user);
    return jsonResponse({
      access_token: token,
      refresh_token: `mock-refresh-${user.id}`,
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name, role: user.metadataRole },
      },
    });
  }

  // Supabase Auth: getUser(token)
  if (parsed.pathname === "/auth/v1/user" && method === "GET") {
    const headers = new Headers(init?.headers || {});
    const authHdr = headers.get("authorization") || headers.get("Authorization") || "";
    const token = authHdr.replace(/^Bearer\s+/i, "").trim();
    const user = mockUsersByToken.get(token);
    if (!user) {
      return jsonResponse({ message: "Invalid token" }, 401);
    }
    return jsonResponse({
      id: user.id,
      email: user.email,
      user_metadata: { name: user.name, role: user.metadataRole },
    });
  }

  // Supabase Auth: recover (forgot-password) & verify (verify-otp / reset-password)
  if (parsed.pathname === "/auth/v1/recover" && method === "POST") {
    return jsonResponse({});
  }
  if (parsed.pathname === "/auth/v1/verify" && method === "POST") {
    const email = String(parsedBody.email || "").toLowerCase().trim();
    const tokenCode = String(parsedBody.token || "").trim();
    const user = mockUsersByEmail.get(email);
    if (!user || tokenCode !== "654321") {
      return jsonResponse({ error: "invalid_otp", message: "Invalid or expired reset code" }, 400);
    }
    const jwt = `mock-jwt-${user.id}`;
    mockUsersByToken.set(jwt, user);
    return jsonResponse({
      access_token: jwt,
      refresh_token: `mock-refresh-${user.id}`,
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { name: user.name, role: user.metadataRole },
      },
    });
  }

  // Supabase PostgREST: profiles
  if (parsed.pathname === "/rest/v1/profiles") {
    const idFilter = parsed.searchParams.get("id")?.replace(/^eq\./, "") || "";
    if (method === "GET" || method === "HEAD") {
      const profile = idFilter ? mockProfilesById.get(idFilter) || null : Array.from(mockProfilesById.values());
      if (parsed.searchParams.get("head") !== null || method === "HEAD") {
        return new Response(null, { status: 200, headers: { "Content-Range": `0-0/${mockProfilesById.size}` } });
      }
      const accept = new Headers(init?.headers || {}).get("accept") || "";
      if (accept.includes("vnd.pgrst.object")) {
        return jsonResponse(profile);
      }
      return jsonResponse(profile ? (Array.isArray(profile) ? profile : [profile]) : []);
    }
    if (method === "POST") {
      const row = Array.isArray(parsedBody) ? parsedBody[0] : parsedBody;
      const existing = mockProfilesById.get(row.id) || {};
      const merged = { ...existing, ...row };
      mockProfilesById.set(row.id, merged);
      return jsonResponse([merged], 201);
    }
    if (method === "PATCH") {
      recordedProfileUpdates.push({ userId: idFilter, body: parsedBody });
      const existing = mockProfilesById.get(idFilter) || { id: idFilter, role: "user" };
      const merged = { ...existing, ...parsedBody };
      mockProfilesById.set(idFilter, merged);
      const accept = new Headers(init?.headers || {}).get("accept") || "";
      return jsonResponse(accept.includes("vnd.pgrst.object") ? merged : [merged]);
    }
  }
  if (parsed.pathname === "/rest/v1/profiles" && method === "HEAD") {
    return new Response(null, { status: 200, headers: { "Content-Range": `*/${Math.max(1, mockProfilesById.size)}` } });
  }

  // Supabase PostgREST: count HEAD requests for resumes / assessments
  if ((parsed.pathname === "/rest/v1/resumes" || parsed.pathname === "/rest/v1/assessments") && (method === "HEAD" || method === "GET")) {
    return new Response(method === "HEAD" ? null : JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Range": "*/12" },
    });
  }

  // Supabase PostgREST: notifications, user_activity, academic_details, etc.
  if (parsed.pathname.startsWith("/rest/v1/")) {
    const accept = new Headers(init?.headers || {}).get("accept") || "";
    if (method === "GET") {
      return jsonResponse(accept.includes("vnd.pgrst.object") ? null : []);
    }
    return jsonResponse(accept.includes("vnd.pgrst.object") ? parsedBody : [parsedBody], 201);
  }

  return jsonResponse({ error: `Unhandled mock route: ${method} ${parsed.pathname}` }, 404);
}) as typeof fetch;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`[PASS] ${name}${detail ? ` (${detail})` : ""}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runTests() {
  const express = (await import("express")).default;
  const authRoutes = (await import("../routes/auth.js")).default;
  const analyticsRoutes = (await import("../routes/analytics.js")).default;
  const adminRoutes = (await import("../routes/admin.js")).default;
  const {
    createRateLimiter,
    resetAllRateLimiters,
    resolveClientIp,
    resolveTrustProxyHops,
  } = await import("../middleware/rateLimiter.js");
  const {
    normalizeLegacyRecruiterRole,
    normalizeRoleFallback,
    resolveTrustedUserRole,
  } = await import("../middleware/auth.js");
  const { isMlProductionEnvironment, mlService } = await import("../services/mlService.js");
  const { findAuthUserByEmail } = await import("../config/supabase.js");
  const { resolveAdminConfig } = await import("./provision_admin.js");

  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", authRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/admin", adminRoutes);

  async function apiRequest(
    routePath: string,
    options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
  ): Promise<{
    status: number;
    ok: boolean;
    headers: { get: (name: string) => string | null };
    json: () => Promise<any>;
  }> {
    return new Promise((resolve, reject) => {
      const sock = new PassThrough() as any;
      sock.remoteAddress = "127.0.0.1";

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(options.headers || {})) {
        headers[k.toLowerCase()] = v;
      }

      let bodyBuf: Buffer | undefined;
      if (options.body !== undefined) {
        const serialized = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
        bodyBuf = Buffer.from(serialized, "utf-8");
        if (!headers["content-type"]) headers["content-type"] = "application/json";
        headers["content-length"] = String(bodyBuf.length);
      }

      const req = new http.IncomingMessage(sock);
      req.method = (options.method || "GET").toUpperCase();
      req.url = `/api${routePath}`;
      req.headers = headers;
      if (bodyBuf) req.push(bodyBuf);
      req.push(null);

      const res = new http.ServerResponse(req);
      const sink = new Writable({
        write(_chunk, _enc, cb) {
          cb();
        },
      });
      res.assignSocket(sink as any);

      const chunks: Buffer[] = [];
      const origWrite = res.write.bind(res);
      const origEnd = res.end.bind(res);
      (res as any).write = (chunk: any, enc?: any, cb?: any) => {
        if (chunk && typeof chunk !== "function") {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof enc === "string" ? (enc as BufferEncoding) : "utf-8"));
        }
        return origWrite(chunk, enc, cb);
      };
      (res as any).end = (chunk?: any, enc?: any, cb?: any) => {
        if (chunk && typeof chunk !== "function") {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof enc === "string" ? (enc as BufferEncoding) : "utf-8"));
        }
        return origEnd(chunk, enc, cb);
      };

      res.on("error", reject);
      res.on("finish", () => {
        const rawText = Buffer.concat(chunks).toString("utf-8");
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          headers: {
            get(name: string) {
              const val = res.getHeader(name.toLowerCase());
              if (val === undefined) return null;
              return Array.isArray(val) ? val.join(", ") : String(val);
            },
          },
          json: async () => (rawText ? JSON.parse(rawText) : null),
        });
      });

      app(req, res);
    });
  }

  try {
    console.log("=== CognifyAI Phase 7.3 Security Remediation Verification ===\n");

    // 1. Organization signup & admin block
    const orgRes = await apiRequest("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.1" },
      body: {
        name: "Acme Recruiting",
        email: "org@cognifyai.test",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        role: "organization",
      },
    });
    const orgData: any = await orgRes.json();
    check(
      "Organization signup succeeds with role='organization'",
      orgRes.status === 201 && orgData?.user?.role === "organization" && recordedSignupRoles.includes("organization"),
      `status=${orgRes.status}, role=${orgData?.user?.role}`
    );

    const recRes = await apiRequest("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.2" },
      body: {
        name: "Recruiter Partner",
        email: "recruiter@cognifyai.test",
        password: "StrongPassword123!",
        role: "recruiter",
      },
    });
    const recData: any = await recRes.json();
    check(
      "Recruiter alias signup maps cleanly to role='organization'",
      recRes.status === 201 && recData?.user?.role === "organization",
      `status=${recRes.status}, role=${recData?.user?.role}`
    );

    const rogueAdminRes = await apiRequest("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.3" },
      body: {
        name: "Rogue Admin",
        email: "rogue@cognifyai.test",
        password: "StrongPassword123!",
        role: "admin",
      },
    });
    check("Public signup with role='admin' is rejected (403)", rogueAdminRes.status === 403, `status=${rogueAdminRes.status}`);

    for (const arbitraryRole of ["superadmin", "moderator", "root", "admin_override"]) {
      const arbRes = await apiRequest("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.3" },
        body: {
          name: "Arbitrary Role User",
          email: `arb.${arbitraryRole}@cognifyai.test`,
          password: "StrongPassword123!",
          role: arbitraryRole,
        },
      });
      const arbData: any = await arbRes.json();
      check(
        `Arbitrary signup role '${arbitraryRole}' is clamped cleanly to 'user'`,
        arbRes.status === 201 && arbData?.user?.role === "user",
        `status=${arbRes.status}, assigned=${arbData?.user?.role}`
      );
    }

    // 2. Normal user cannot change their role + unauthenticated PUT /profile rejected
    await apiRequest("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.4" },
      body: {
        name: "Normal Student",
        email: "student@cognifyai.test",
        password: "StrongPassword123!",
        role: "user",
      },
    });
    const loginRes = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.4" },
      body: {
        email: "student@cognifyai.test",
        password: "StrongPassword123!",
      },
    });
    const loginData: any = await loginRes.json();
    const studentToken = loginData?.token;
    check("Normal student login returns trusted token and role='user'", loginRes.ok && Boolean(studentToken) && loginData?.user?.role === "user");

    const updatesBeforeUnauthPut = recordedProfileUpdates.length;
    const unauthPutRes = await apiRequest("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: { name: "Hacker", role: "admin" },
    });
    check(
      "Unauthenticated PUT /api/auth/profile is rejected (401) with zero DB writes",
      unauthPutRes.status === 401 && recordedProfileUpdates.length === updatesBeforeUnauthPut,
      `status=${unauthPutRes.status}`
    );

    const updateRes = await apiRequest("/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: {
        name: "Student Updated",
        role: "admin",
      },
    });
    const updateData: any = await updateRes.json();
    const lastPatch = recordedProfileUpdates[recordedProfileUpdates.length - 1];
    check(
      "PUT /auth/profile ignores role escalation field in update payload",
      updateRes.ok && updateData?.role === "user" && lastPatch && !("role" in lastPatch.body),
      `storedRole=${updateData?.role}, patchKeys=${Object.keys(lastPatch?.body || {}).join(",")}`
    );

    const adminAttempt = await apiRequest("/admin/users", {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    check("Normal user remains blocked from admin endpoints (403)", adminAttempt.status === 403, `status=${adminAttempt.status}`);

    // 2b. OTP verification role lookup + recruiter fallback normalization
    const orgOtpRes = await apiRequest("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.1" },
      body: { email: "org@cognifyai.test", code: "654321", role: "admin" },
    });
    const orgOtpData: any = await orgOtpRes.json();
    check(
      "POST /auth/verify-otp returns authoritative profile role='organization' and ignores body role",
      orgOtpRes.status === 200 && orgOtpData?.user?.role === "organization",
      `status=${orgOtpRes.status}, role=${orgOtpData?.user?.role}`
    );

    // Seed an admin account directly in mock Auth + DB profiles (cannot self-register as admin)
    const adminId = "00000000-0000-4000-8000-999999999999";
    const adminEmail = "admin.seeded@cognifyai.test";
    const adminUser: MockUserRecord = {
      id: adminId,
      email: adminEmail,
      password: "AdminStrongPassword123!",
      name: "Seeded Admin",
      role: "admin",
      metadataRole: "admin",
    };
    mockUsersByEmail.set(adminEmail, adminUser);
    mockProfilesById.set(adminId, { id: adminId, name: "Seeded Admin", email: adminEmail, role: "admin" });
    const adminOtpRes = await apiRequest("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.5" },
      body: { email: adminEmail, code: "654321" },
    });
    const adminOtpData: any = await adminOtpRes.json();
    const adminToken = adminOtpData?.token;
    check(
      "POST /auth/verify-otp preserves authoritative role='admin' from public.profiles",
      adminOtpRes.status === 200 && adminOtpData?.user?.role === "admin" && Boolean(adminToken),
      `status=${adminOtpRes.status}, role=${adminOtpData?.user?.role}`
    );

    // Seed missing profile + rogue admin metadata & legacy recruiter metadata to test fail-safe fallbacks
    const rogueMetaId = "00000000-0000-4000-8000-888888888888";
    const rogueMetaEmail = "noprofile.adminmeta@cognifyai.test";
    mockUsersByEmail.set(rogueMetaEmail, {
      id: rogueMetaId,
      email: rogueMetaEmail,
      password: "StrongPassword123!",
      name: "No Profile User",
      role: "user",
      metadataRole: "admin",
    });
    const rogueMetaOtpRes = await apiRequest("/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.6" },
      body: { email: rogueMetaEmail, code: "654321" },
    });
    const rogueMetaOtpData: any = await rogueMetaOtpRes.json();
    check(
      "Missing profile never trusts user_metadata.role='admin' (clamps to 'user')",
      rogueMetaOtpRes.status === 200 && rogueMetaOtpData?.user?.role === "user",
      `role=${rogueMetaOtpData?.user?.role}`
    );

    const legacyRecId = "00000000-0000-4000-8000-777777777777";
    const legacyRecEmail = "legacy.recruiter@cognifyai.test";
    mockUsersByEmail.set(legacyRecEmail, {
      id: legacyRecId,
      email: legacyRecEmail,
      password: "StrongPassword123!",
      name: "Legacy Recruiter",
      role: "recruiter",
      metadataRole: "recruiter",
    });
    const legacyLoginRes = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.7" },
      body: { email: legacyRecEmail, password: "StrongPassword123!" },
    });
    const legacyLoginData: any = await legacyLoginRes.json();
    check(
      "Login & missing-profile upsert normalize legacy 'recruiter' metadata to 'organization'",
      legacyLoginRes.ok &&
        legacyLoginData?.user?.role === "organization" &&
        mockProfilesById.get(legacyRecId)?.role === "organization" &&
        normalizeLegacyRecruiterRole("recruiter") === "organization" &&
        normalizeRoleFallback("admin") === "user" &&
        (await resolveTrustedUserRole(legacyRecId, "recruiter")) === "organization",
      `loginRole=${legacyLoginData?.user?.role}, persistedRole=${mockProfilesById.get(legacyRecId)?.role}`
    );

    // 3. Platform analytics strictly restricted to administrators
    const orgLoginRes = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.8" },
      body: { email: "org@cognifyai.test", password: "StrongPassword123!" },
    });
    const orgLoginData: any = await orgLoginRes.json();
    const orgToken = orgLoginData?.token;

    const unauthAnalytics = await apiRequest("/analytics/android-vs-web");
    check("GET /api/analytics/android-vs-web rejects missing token (401)", unauthAnalytics.status === 401, `status=${unauthAnalytics.status}`);

    const badTokenAnalytics = await apiRequest("/analytics/android-vs-web", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    check("GET /api/analytics/android-vs-web rejects invalid token (401)", badTokenAnalytics.status === 401, `status=${badTokenAnalytics.status}`);

    const userAnalytics = await apiRequest("/analytics/android-vs-web", {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    check("GET /api/analytics/android-vs-web blocks ordinary user (403)", userAnalytics.status === 403, `status=${userAnalytics.status}`);

    const orgAnalytics = await apiRequest("/analytics/android-vs-web", {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    check("GET /api/analytics/android-vs-web blocks organization user (403)", orgAnalytics.status === 403, `status=${orgAnalytics.status}`);

    const adminAnalytics = await apiRequest("/analytics/android-vs-web", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAnalyticsData: any = await adminAnalytics.json();
    check(
      "GET /api/analytics/android-vs-web succeeds for admin user (200) and preserves shape",
      adminAnalytics.status === 200 &&
        Array.isArray(adminAnalyticsData?.metrics) &&
        Array.isArray(adminAnalyticsData?.platformGrowth),
      `status=${adminAnalytics.status}`
    );

    const dashboardTsx = fs.readFileSync(path.join(REPO_ROOT, "WebApp/src/routes/dashboard.tsx"), "utf-8");
    check(
      "WebApp dashboard hides /platform-analytics tile behind adminOnly && userRole === 'admin'",
      /to:\s*"\/platform-analytics"[\s\S]*?adminOnly:\s*true/.test(dashboardTsx) &&
        /userRole\s*===\s*"admin"/.test(dashboardTsx)
    );

    // 4. ML production environment detection parity + fail-closed + HTTP 401 on wrong secret
    const savedMlEnv: Record<string, string | undefined> = {};
    const mlEnvKeys = ["APP_ENV", "ENVIRONMENT", "ENV", "NODE_ENV", "RENDER", "ML_REQUIRE_SECRET", "ML_SERVICE_SECRET", "ML_SERVICE_URL"];
    for (const k of mlEnvKeys) savedMlEnv[k] = process.env[k];

    const clearMlProdEnv = () => {
      for (const k of mlEnvKeys) delete process.env[k];
    };

    try {
      clearMlProdEnv();
      check("isMlProductionEnvironment returns false in blank local env", isMlProductionEnvironment({}) === false);
      check("isMlProductionEnvironment detects APP_ENV=production", isMlProductionEnvironment({ APP_ENV: "production" }) === true);
      check("isMlProductionEnvironment detects ENVIRONMENT=prod", isMlProductionEnvironment({ ENVIRONMENT: "prod" }) === true);
      check("isMlProductionEnvironment detects ENV=production", isMlProductionEnvironment({ ENV: "production" }) === true);
      check("isMlProductionEnvironment detects NODE_ENV=production", isMlProductionEnvironment({ NODE_ENV: "production" }) === true);
      check("isMlProductionEnvironment detects RENDER=1", isMlProductionEnvironment({ RENDER: "1" }) === true);
      check("isMlProductionEnvironment detects ML_REQUIRE_SECRET=yes", isMlProductionEnvironment({ ML_REQUIRE_SECRET: "yes" }) === true);
      check("isMlProductionEnvironment rejects staging/false", isMlProductionEnvironment({ APP_ENV: "staging", RENDER: "false" }) === false);

      // Fail closed under APP_ENV=production even when NODE_ENV/RENDER are unset
      clearMlProdEnv();
      process.env.APP_ENV = "production";
      process.env.ML_SERVICE_SECRET = "";
      process.env.ML_SERVICE_URL = MOCK_ML_ORIGIN;
      const mlReadyAppEnv = await mlService.checkHealth(true);
      const mlFallbackAppEnv = await mlService.predictATS("Python FastAPI Docker React Developer Resume Example Text", undefined, "Python Developer");
      check(
        "Express MLService fails closed when APP_ENV=production and ML_SERVICE_SECRET is empty",
        mlReadyAppEnv === false && mlFallbackAppEnv.source === "fallback",
        `mlReady=${mlReadyAppEnv}, source=${mlFallbackAppEnv.source}`
      );

      // Wrong secret sent by MLService -> FastAPI 401 causes safe fallback, whereas valid secret succeeds
      recordedMlSecretHeaders.length = 0;
      process.env.ML_SERVICE_SECRET = "wrong-ml-secret";
      const wrongSecretAts = await mlService.predictATS("Python FastAPI Docker Developer", undefined, "Python Developer");
      check(
        "Express MLService rejects ML engine 401 response on wrong secret and falls back",
        wrongSecretAts.source === "fallback" && recordedMlSecretHeaders.includes("wrong-ml-secret"),
        `source=${wrongSecretAts.source}, sent=${recordedMlSecretHeaders.join(",")}`
      );

      recordedMlSecretHeaders.length = 0;
      process.env.ML_SERVICE_SECRET = EXPECTED_ML_TEST_SECRET;
      const validSecretAts = await mlService.predictATS("Python FastAPI Docker Developer", undefined, "Python Developer");
      check(
        "Express MLService succeeds with matching ML_SERVICE_SECRET header",
        validSecretAts.source === "ml_engine" && recordedMlSecretHeaders.includes(EXPECTED_ML_TEST_SECRET),
        `source=${validSecretAts.source}`
      );
    } finally {
      clearMlProdEnv();
      for (const k of mlEnvKeys) {
        if (savedMlEnv[k] !== undefined) process.env[k] = savedMlEnv[k];
      }
    }

    // 5. Proxy IP validation, spoofed/multi-hop X-Forwarded-For defense & auth rate limiters
    let badProxyRejected = false;
    try {
      resolveTrustProxyHops({ TRUST_PROXY_HOPS: "-1" });
    } catch {
      badProxyRejected = true;
    }
    let floatProxyRejected = false;
    try {
      resolveTrustProxyHops({ TRUST_PROXY_HOPS: "1.5" });
    } catch {
      floatProxyRejected = true;
    }
    let alphaProxyRejected = false;
    try {
      resolveTrustProxyHops({ TRUST_PROXY_HOPS: "invalid" });
    } catch {
      alphaProxyRejected = true;
    }
    check(
      "resolveTrustProxyHops validates non-negative integers and defaults (0 direct, 1 Render)",
      badProxyRejected &&
        floatProxyRejected &&
        alphaProxyRejected &&
        resolveTrustProxyHops({}) === 0 &&
        resolveTrustProxyHops({ RENDER: "true" }) === 1 &&
        resolveTrustProxyHops({ TRUST_PROXY_HOPS: "0", RENDER: "true" }) === 0 &&
        resolveTrustProxyHops({ TRUST_PROXY_HOPS: "2" }) === 2
    );

    const syntheticSpoofReq = {
      ip: "",
      headers: { "x-forwarded-for": "203.0.113.200" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any;
    check(
      "resolveClientIp ignores left-most X-Forwarded-For header when req.ip is empty",
      resolveClientIp(syntheticSpoofReq) === "127.0.0.1"
    );

    const dispatchToApp = async (
      targetApp: any,
      routePath: string,
      headers: Record<string, string> = {}
    ): Promise<number> =>
      new Promise((resolve, reject) => {
        const sock = new PassThrough() as any;
        sock.remoteAddress = "127.0.0.1";
        const req = new http.IncomingMessage(sock);
        req.method = "POST";
        req.url = routePath;
        req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
        req.push(null);
        const res = new http.ServerResponse(req);
        const sink = new Writable({ write(_c, _e, cb) { cb(); } });
        res.assignSocket(sink as any);
        res.on("error", reject);
        res.on("finish", () => resolve(res.statusCode));
        targetApp(req, res);
      });

    // Direct connection (trust proxy = 0): spoofed X-Forwarded-For rotation cannot evade 429
    const directApp = express();
    directApp.set("trust proxy", 0);
    const directLimiter = createRateLimiter({ name: "test-direct", windowMs: 60_000, maxRequests: 2 });
    directApp.post("/probe", directLimiter, (_req, res) => res.status(200).json({ ok: true }));
    const d1 = await dispatchToApp(directApp, "/probe", { "X-Forwarded-For": "198.51.100.1" });
    const d2 = await dispatchToApp(directApp, "/probe", { "X-Forwarded-For": "198.51.100.2" });
    const d3 = await dispatchToApp(directApp, "/probe", { "X-Forwarded-For": "198.51.100.3" });
    check(
      "Direct mode (trust proxy=0) ignores spoofed X-Forwarded-For rotation and blocks on socket IP (429)",
      d1 === 200 && d2 === 200 && d3 === 429,
      `statuses=${d1},${d2},${d3}`
    );

    // Trusted 1-hop proxy (trust proxy = 1): multi-hop spoofed left-most IPs still hit right-most trusted hop
    const proxyApp = express();
    proxyApp.set("trust proxy", 1);
    const proxyLimiter = createRateLimiter({ name: "test-proxy", windowMs: 60_000, maxRequests: 2 });
    proxyApp.post("/probe", proxyLimiter, (_req, res) => res.status(200).json({ ok: true }));
    const p1 = await dispatchToApp(proxyApp, "/probe", { "X-Forwarded-For": "192.0.2.1, 203.0.113.50" });
    const p2 = await dispatchToApp(proxyApp, "/probe", { "X-Forwarded-For": "192.0.2.2, 203.0.113.50" });
    const p3 = await dispatchToApp(proxyApp, "/probe", { "X-Forwarded-For": "192.0.2.3, 203.0.113.50" });
    const pOtherClient = await dispatchToApp(proxyApp, "/probe", { "X-Forwarded-For": "192.0.2.1, 203.0.113.51" });
    check(
      "Trusted 1-hop proxy resists multi-hop left-most X-Forwarded-For spoofing while isolating distinct clients",
      p1 === 200 && p2 === 200 && p3 === 429 && pOtherClient === 200,
      `statuses=${p1},${p2},${p3},other=${pOtherClient}`
    );

    resetAllRateLimiters();
    const rateTargets = [
      { path: "/auth/forgot-password", limit: 5, body: { email: "nobody@cognifyai.test" }, ip: "10.9.0.1" },
      { path: "/auth/signup", limit: 10, body: { name: "", email: "bad", password: "short" }, ip: "10.9.0.2" },
      { path: "/auth/verify-otp", limit: 10, body: { email: "nobody@cognifyai.test", code: "123456" }, ip: "10.9.0.3" },
      { path: "/auth/reset-password", limit: 10, body: { email: "nobody@cognifyai.test", code: "123456", password: "StrongPassword123!", confirmPassword: "StrongPassword123!" }, ip: "10.9.0.4" },
      { path: "/auth/login", limit: 15, body: { email: "nobody@cognifyai.test", password: "wrong" }, ip: "10.9.0.5" },
    ];

    for (const target of rateTargets) {
      let sawEarly429 = false;
      for (let i = 0; i < target.limit; i++) {
        const r = await apiRequest(target.path, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Forwarded-For": target.ip },
          body: target.body,
        });
        if (r.status === 429) sawEarly429 = true;
      }
      const blocked = await apiRequest(target.path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": target.ip },
        body: target.body,
      });
      check(
        `Rate limiter blocks ${target.path} after ${target.limit} requests (429)`,
        !sawEarly429 && blocked.status === 429 && Boolean(blocked.headers.get("retry-after")),
        `status=${blocked.status}, retryAfter=${blocked.headers.get("retry-after")}`
      );
    }

    // 6. Admin provisioning, Supabase pagination & dev script guards across all legacy scripts
    let missingThrown = false;
    try {
      resolveAdminConfig(["node", "provision_admin.ts", "admin@example.com"], {});
    } catch {
      missingThrown = true;
    }
    let defaultThrown = false;
    try {
      resolveAdminConfig(["node", "provision_admin.ts", "admin@example.com", "AdminPass123!"], {});
    } catch {
      defaultThrown = true;
    }
    let weakThrown = false;
    try {
      resolveAdminConfig(["node", "provision_admin.ts", "admin@example.com", "short1!"], {});
    } catch {
      weakThrown = true;
    }
    const validAdminCfg = resolveAdminConfig(["node", "provision_admin.ts", "admin@example.com", "Sup3r!Strong#Admin2026"], {});
    check(
      "Admin provisioning rejects missing, legacy default, and weak passwords while accepting strong explicit password",
      missingThrown && defaultThrown && weakThrown && validAdminCfg.email === "admin@example.com",
      `missing=${missingThrown}, default=${defaultThrown}, weak=${weakThrown}`
    );

    const visitedPages: number[] = [];
    const matchedUser = await findAuthUserByEmail(
      "target.admin@cognifyai.test",
      async ({ page, perPage }) => {
        visitedPages.push(page);
        if (page === 1 || page === 2) {
          return {
            data: {
              users: Array.from({ length: perPage }, (_, idx) => ({
                id: `u-${page}-${idx}`,
                email: `user-${page}-${idx}@cognifyai.test`,
              })),
              nextPage: page + 1,
              lastPage: 4,
            },
            error: null,
          };
        }
        return {
          data: {
            users: [{ id: "u-3-0", email: "Target.Admin@cognifyai.test" }],
            nextPage: 4,
            lastPage: 4,
          },
          error: null,
        };
      },
      2
    );
    const missingPaginated = await findAuthUserByEmail(
      "absent@cognifyai.test",
      async ({ page }) => ({
        data: { users: page === 1 ? [{ id: "u1", email: "other@cognifyai.test" }] : [], nextPage: null },
        error: null,
      }),
      2
    );
    let pageErrorCaught = false;
    try {
      await findAuthUserByEmail(
        "err@cognifyai.test",
        async ({ page }) =>
          page === 1
            ? { data: { users: [{ id: "1", email: "a@b.c" }], nextPage: 2 }, error: null }
            : { data: { users: [] }, error: { message: "Auth page failure" } },
        1
      );
    } catch {
      pageErrorCaught = true;
    }
    check(
      "findAuthUserByEmail searches across pages, stops cleanly once found or exhausted, and surfaces errors",
      matchedUser?.id === "u-3-0" && visitedPages.join(",") === "1,2,3" && missingPaginated === null && pageErrorCaught,
      `pages=${visitedPages.join(",")}, matched=${matchedUser?.id}`
    );

    const tsxCli = path.join(REPO_ROOT, "WebApp/node_modules/tsx/dist/cli.mjs");
    const cliProc = spawnSync(process.execPath, [tsxCli, path.join(REPO_ROOT, "WebApp/backend/src/scripts/provision_admin.ts"), "admin@example.com"], {
      cwd: REPO_ROOT,
      env: { ...process.env, ADMIN_PASSWORD: "" },
      encoding: "utf-8",
    });
    check("provision_admin CLI exits non-zero when password omitted", cliProc.status !== 0, `exitCode=${cliProc.status}`);

    const legacyScripts = [
      "WebApp/backend/src/config/reset_john_password.ts",
      "WebApp/backend/src/config/test_login.ts",
      "WebApp/backend/src/config/test_register.ts",
      "WebApp/backend/src/config/test_api_signup_login.ts",
    ];
    for (const scriptRel of legacyScripts) {
      const prodGuardProc = spawnSync(process.execPath, [tsxCli, path.join(REPO_ROOT, scriptRel)], {
        cwd: REPO_ROOT,
        env: { ...process.env, NODE_ENV: "production" },
        encoding: "utf-8",
      });
      check(
        `Legacy script ${path.basename(scriptRel)} blocks NODE_ENV=production`,
        prodGuardProc.status !== 0 && prodGuardProc.stderr.includes("SECURITY BLOCK"),
        `exitCode=${prodGuardProc.status}`
      );

      const devOptInEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development" };
      delete devOptInEnv.RENDER;
      delete devOptInEnv.ALLOW_LEGACY_DEV_SCRIPTS;
      const optInProc = spawnSync(process.execPath, [tsxCli, path.join(REPO_ROOT, scriptRel)], {
        cwd: REPO_ROOT,
        env: devOptInEnv,
        encoding: "utf-8",
      });
      check(
        `Legacy script ${path.basename(scriptRel)} blocks local run without ALLOW_LEGACY_DEV_SCRIPTS=true`,
        optInProc.status !== 0 && optInProc.stderr.includes("SECURITY BLOCK"),
        `exitCode=${optInProc.status}`
      );
    }

    // 7. Render Blueprint YAML validation + Migration 015 static inspection + Mobile EAS URL checks
    const require = createRequire(path.join(REPO_ROOT, "WebApp/package.json"));
    const yaml = require("js-yaml");
    const renderDoc: any = yaml.load(fs.readFileSync(path.join(REPO_ROOT, "render.yaml"), "utf-8"));
    const services: any[] = renderDoc?.services || [];
    const webSvc = services.find((s) => s.name === "cognifyai-web");
    const mlSvc = services.find((s) => s.name === "cognifyai-ml");
    const mlHasAppEnvProd = Array.isArray(mlSvc?.envVars) && mlSvc.envVars.some((e: any) => e.key === "APP_ENV" && e.value === "production");
    check(
      "render.yaml parses cleanly: pserv omits healthCheckPath, web keeps /api/health, ML sets APP_ENV=production",
      Boolean(webSvc) &&
        Boolean(mlSvc) &&
        webSvc.type === "web" &&
        webSvc.healthCheckPath === "/api/health" &&
        mlSvc.type === "pserv" &&
        !("healthCheckPath" in mlSvc) &&
        mlHasAppEnvProd
    );

    const mig015 = fs.readFileSync(
      path.join(REPO_ROOT, "WebApp/supabase/migrations/015_phase7_storage_and_security_hardening.sql"),
      "utf-8"
    );
    const mig015ExecutableSql = mig015
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    const hasTransactionWrapper = /^\s*BEGIN;/im.test(mig015ExecutableSql) && /\bCOMMIT;\s*$/im.test(mig015ExecutableSql);
    const hasProfilesRlsEnabled =
      /ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/i.test(mig015ExecutableSql) &&
      /CREATE POLICY "Users can view own profile"/i.test(mig015ExecutableSql) &&
      /CREATE POLICY "Allow owners to update their profile"[\s\S]*?WITH CHECK \(/i.test(mig015ExecutableSql) &&
      /REVOKE ALL ON TABLE public\.profiles FROM anon;/i.test(mig015ExecutableSql) &&
      /REVOKE ALL ON TABLE public\.profiles FROM authenticated;/i.test(mig015ExecutableSql) &&
      /GRANT SELECT, UPDATE ON TABLE public\.profiles TO authenticated;/i.test(mig015ExecutableSql);
    const hasRoleCheckFix = /ADD CONSTRAINT profiles_role_check\s+CHECK \(role IN \('user', 'organization', 'recruiter', 'admin'\)\)/i.test(mig015ExecutableSql);
    const hasSecurityInvokerFailClosed =
      /CREATE OR REPLACE FUNCTION public\.prevent_profile_role_escalation\(\)[\s\S]*?SECURITY INVOKER/i.test(mig015ExecutableSql) &&
      /is_service_role[\s\S]*?jwt_role = 'service_role'[\s\S]*?is_direct_db_admin/i.test(mig015ExecutableSql);
    const hasSchemaAlignedHelper =
      /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?INSERT INTO public\.profiles \(id, name, email, role\)/i.test(mig015ExecutableSql) &&
      !/\b(title|bio|avatar|location)\b/i.test(mig015ExecutableSql);
    const hasNoPrivilegedOwnerDdl =
      !/ON auth\.users/i.test(mig015ExecutableSql) &&
      !/\bstorage\.(buckets|objects)\b/i.test(mig015ExecutableSql);
    const hasIdempotentDrops =
      /DROP CONSTRAINT IF EXISTS profiles_role_check/i.test(mig015ExecutableSql) &&
      /DROP TRIGGER IF EXISTS prevent_profile_role_change/i.test(mig015ExecutableSql);
    check(
      "Migration 015 passes Phase 7.6 non-superuser/live-schema static SQL invariants",
      hasTransactionWrapper &&
        hasProfilesRlsEnabled &&
        hasRoleCheckFix &&
        hasSecurityInvokerFailClosed &&
        hasSchemaAlignedHelper &&
        hasNoPrivilegedOwnerDdl &&
        hasIdempotentDrops
    );

    const easCfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "MobileApp/eas.json"), "utf-8"));
    const apiTs = fs.readFileSync(path.join(REPO_ROOT, "MobileApp/src/services/api.ts"), "utf-8");
    const previewUrl = String(easCfg?.build?.preview?.env?.EXPO_PUBLIC_API_URL || "");
    const prodUrl = String(easCfg?.build?.production?.env?.EXPO_PUBLIC_API_URL || "");
    const isPrivateOrLanUrl = (rawUrl: string): boolean => {
      try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname.toLowerCase();
        if (parsed.protocol !== "https:") return true;
        return (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "::1" ||
          /^10\./.test(host) ||
          /^192\.168\./.test(host) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
        );
      } catch {
        return true;
      }
    };
    check(
      "MobileApp eas.json preview/production URLs use HTTPS public hosts (no LAN IPs) & api.ts sets 65s timeout",
      previewUrl === "https://cognifyai-web.onrender.com/api" &&
        prodUrl === "https://cognifyai-web.onrender.com/api" &&
        !isPrivateOrLanUrl(previewUrl) &&
        !isPrivateOrLanUrl(prodUrl) &&
        /65000/.test(apiTs),
      `preview=${previewUrl}, production=${prodUrl}`
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
