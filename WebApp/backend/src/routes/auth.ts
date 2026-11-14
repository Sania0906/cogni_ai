import { Router, Response } from "express";
import {
  authMiddleware,
  AuthRequest,
  normalizeLegacyRecruiterRole,
  normalizeRoleFallback,
  resolveTrustedUserRole,
} from "../middleware/auth.js";
import {
  signupRateLimiter,
  loginRateLimiter,
  verifyOtpRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from "../middleware/rateLimiter.js";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";
import jwt from "jsonwebtoken";

const router = Router();

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// =========================================================================
// 1. SIGNUP
// =========================================================================
router.post("/signup", signupRateLimiter, async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  // Validate confirmPassword if provided (MobileApp may omit it, sending role instead)
  const effectiveConfirmPassword = confirmPassword !== undefined ? confirmPassword : password;
  if (password !== effectiveConfirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
  }

  // Controlled role selection: Allow 'user' and 'organization' (or 'recruiter' mapped to 'organization')
  // Public signup must NEVER assign 'admin'. Admin accounts must be securely provisioned.
  const requestedRole = (role || "user").toLowerCase().trim();
  if (requestedRole === "admin") {
    return res.status(403).json({
      message: "Admin accounts cannot be created via public registration. Admin access must be provisioned securely.",
    });
  }

  let assignedRole = "user";
  if (requestedRole === "organization" || requestedRole === "recruiter") {
    assignedRole = "organization";
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    console.log(`Creating user with role: ${assignedRole}...`);

    let userObj: any = null;
    let authError: any = null;

    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        message:
          "Database service is not configured. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment.",
      });
    }

    const adminRes = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: assignedRole,
      },
    });

    if (adminRes.data?.user) {
      userObj = adminRes.data.user;
      console.log("User created successfully via admin");
    } else {
      console.warn(
        "Admin createUser failed/unauthorized, falling back to signUp:",
        adminRes.error?.message,
      );
      const signUpRes = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          data: {
            name,
            role: assignedRole,
          },
        },
      });

      if (signUpRes.data?.user) {
        userObj = signUpRes.data.user;
        console.log("User created successfully via signUp");
      } else {
        authError = signUpRes.error || adminRes.error;
      }
    }

    if (authError && !userObj) {
      console.error("Signup Auth Error:", authError);
      return res.status(400).json({
        message: authError.message || "Failed to create user",
      });
    }

    // Write profile record using service role
    if (userObj) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: userObj.id,
            name,
            email: formattedEmail,
            role: assignedRole,
          });
        if (profileError) {
          console.warn(
            "[Supabase Profiles] Profile sync warning:",
            profileError.message,
          );
        }

        // Seed welcome notification for new user (matching live schema: is_read)
        const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
          user_id: userObj.id,
          title: "Welcome to CognifyAI!",
          message:
            assignedRole === "organization"
              ? "Your organization recruiter workspace is ready. Discover AI-matched candidates today."
              : "Upload your resume to unlock instant ATS optimization and AI Career Twin predictions.",
          is_read: false,
        });
        if (notifErr) {
          console.warn("[Supabase Notifications] Welcome seed warning:", notifErr.message);
        }
      } catch (syncErr) {
        console.warn("[Supabase Profiles] Profile sync warning:", syncErr);
      }
    }

    return res.status(201).json({
      message: "Registration successful! You can now log in immediately.",
      email: formattedEmail,
      user: {
        id: userObj.id,
        email: formattedEmail,
        name,
        role: assignedRole,
      },
    });

  } catch (err: any) {
    console.error("Supabase Signup Exception:", err);
    return res
      .status(500)
      .json({
        message: err.message || "Internal server error during registration",
      });
  }
});

// =========================================================================
// 2. LOGIN
// =========================================================================
router.post("/login", loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        message:
          "Authentication service is not configured. Please verify SUPABASE_URL and SUPABASE_ANON_KEY in the backend environment.",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (
        errMsg.includes("confirm") ||
        errMsg.includes("verified") ||
        (error.status === 400 && errMsg.includes("email"))
      ) {
        return res.status(403).json({
          message:
            "Email is not verified. Please check your email for the confirmation link or disable email confirmation in your Supabase dashboard settings.",
          unverified: true,
          email: formattedEmail,
        });
      }
      return res.status(400).json({ message: error.message });
    }

    // Fetch user profile info from database (trusted authority)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.user?.id)
      .maybeSingle();

    const trustedRole = profile?.role
      ? normalizeLegacyRecruiterRole(profile.role)
      : normalizeRoleFallback(data.user?.user_metadata?.role);
    const userName = profile?.name || data.user?.user_metadata?.name || formattedEmail.split("@")[0];

    // If profile didn't exist, create it with trusted role
    if (!profile && data.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        name: userName,
        email: formattedEmail,
        role: trustedRole,
      });
    }

    return res.json({
      token: data.session?.access_token,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        name: userName,
        email: data.user?.email,
        role: trustedRole,
      },
    });
  } catch (err: any) {
    console.error("Supabase Login Exception:", err);
    return res
      .status(500)
      .json({ message: err.message || "Internal server error during login" });
  }
});

// =========================================================================
// 2b. LOGOUT
// =========================================================================
router.post("/logout", async (req, res) => {
  try {
    await supabase.auth.signOut();
    return res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Logout failed" });
  }
});

// =========================================================================
// 2c. REFRESH SESSION
// =========================================================================
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token || typeof refresh_token !== "string") {
    return res.status(400).json({ message: "refresh_token is required" });
  }

  try {
    if (!isSupabaseConfigured()) {
      return res
        .status(503)
        .json({ message: "Authentication service is not configured." });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refresh_token.trim(),
    });

    if (error || !data.session) {
      return res
        .status(401)
        .json({ message: error?.message || "Invalid or expired refresh token" });
    }

    return res.json({
      token: data.session.access_token,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });
  } catch (err: any) {
    console.error("Token Refresh Exception:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to refresh token" });
  }
});


// =========================================================================
// 3. VERIFY OTP
// =========================================================================
router.post("/verify-otp", verifyOtpRateLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: formattedEmail,
      token: code,
      type: "recovery",
    });

    if (error || !data.user) {
      return res
        .status(400)
        .json({ message: error?.message || "Invalid or expired reset code" });
    }

    const trustedRole = await resolveTrustedUserRole(
      data.user.id,
      data.user.user_metadata?.role,
    );

    return res.json({
      message: "Code verified successfully.",
      token: data.session?.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: trustedRole,
      },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Verification failed" });
  }
});

// =========================================================================
// 4. FORGOT PASSWORD
// =========================================================================
router.post("/forgot-password", forgotPasswordRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required" });
  }

  const formattedEmail = email.trim().toLowerCase();

  try {
    const appUrl =
      process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectTo = `${appUrl.replace(/\/$/, "")}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
      redirectTo,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: "Password reset verification code sent to email",
      email: formattedEmail,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to send reset code" });
  }
});

// =========================================================================
// 5. RESET PASSWORD
// =========================================================================
router.post("/reset-password", resetPasswordRateLimiter, async (req, res) => {
  const { email, code, password, confirmPassword } = req.body;

  if (!email || !code || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const formattedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const formattedCode =
    typeof code === "string" ? code.trim() : String(code || "").trim();

  if (!formattedEmail) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  if (!/^\d{6}$/.test(formattedCode)) {
    return res
      .status(400)
      .json({ message: "Verification code must be exactly 6 digits" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // 1. Verify OTP using stateless client (persistSession: false)
    let verificationResult = await supabase.auth.verifyOtp({
      email: formattedEmail,
      token: formattedCode,
      type: "recovery",
    });

    // If client verification didn't succeed, retry with admin client as safe fallback
    if (verificationResult.error && supabaseAdmin) {
      const adminResult = await supabaseAdmin.auth.verifyOtp({
        email: formattedEmail,
        token: formattedCode,
        type: "recovery",
      });
      if (!adminResult.error && adminResult.data?.user) {
        verificationResult = adminResult;
      }
    }

    const { data, error } = verificationResult;

    if (error || !data?.user) {
      const emailDomain = formattedEmail.includes("@")
        ? formattedEmail.split("@")[1]
        : "unknown";
      console.error(`[Auth] verifyOtp rejected for @${emailDomain}:`, {
        status: error?.status,
        code: (error as any)?.code,
        name: error?.name,
        message: error?.message,
        hasUser: !!data?.user,
        codeLength: formattedCode.length,
      });

      return res.status(400).json({
        message: error?.message || "Invalid or expired reset code",
      });
    }

    // 2. Override password ONLY after successful recovery OTP verification
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
        password,
      });

    if (updateError) {
      console.error("[Auth] updateUserById error:", {
        message: updateError.message,
      });
      return res.status(400).json({ message: updateError.message });
    }

    return res.json({ message: "Password has been reset successfully." });
  } catch (err: any) {
    console.error("[Auth] reset-password unexpected error:", {
      message: err?.message,
    });
    return res
      .status(500)
      .json({ message: err.message || "Failed to reset password" });
  }
});

// =========================================================================
// 6. GET PROFILE
// =========================================================================
router.get(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", req.user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { data: resumeData } = await supabaseAdmin
          .from("resumes")
          .select("*")
          .eq("user_id", req.user?.id)
          .maybeSingle();

        const { data: acadData } = await supabaseAdmin
          .from("academic_details")
          .select("*")
          .eq("user_id", req.user?.id)
          .maybeSingle();

        const { data: metaData } = await supabaseAdmin
          .from("user_activity")
          .select("metadata")
          .eq("user_id", req.user?.id)
          .eq("action", "profile_meta")
          .maybeSingle();

        const extra = metaData?.metadata || {};

        return res.json({
          ...data,
          headline: extra.headline || extra.title || "Professional",
          title: extra.title || extra.headline || "Professional",
          bio: extra.bio || "",
          location: extra.location || "Remote",
          target_role: extra.target_role || extra.targetRole || (data?.interests && data.interests[0]) || "Software Engineer",
          targetRole: extra.target_role || extra.targetRole || (data?.interests && data.interests[0]) || "Software Engineer",
          academicDetails: acadData || null,
          resumeDetails: resumeData || null,
        });
      }

      // If profile record does not exist in DB yet, auto-create it using user details
      const fallbackProfile = {
        id: req.user?.id,
        name: req.user?.email ? req.user.email.split("@")[0] : "User",
        email: req.user?.email || "",
        role: normalizeLegacyRecruiterRole(req.user?.role),
        onboarding_completed: false,
      };

      await supabaseAdmin.from("profiles").upsert(fallbackProfile);

      return res.json({
        ...fallbackProfile,
        title: "Professional",
        location: "Remote",
        academicDetails: null,
        resumeDetails: null,
      });

    } catch (err: any) {
      console.error("Supabase Profile Fetch Error:", err.message);
      return res
        .status(500)
        .json({ message: err.message || "Failed to retrieve profile" });
    }
  },
);

// =========================================================================
// 7. COMPLETE PROFILE (ONBOARDING)
// =========================================================================
router.post(
  "/profile/complete",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const {
      degree,
      department,
      college,
      grad_year,
      cgpa,
      interests,
      linkedin_url,
      github_url,
      skills,
      certifications,
    } = req.body;

    try {
      // 1. Update profiles table
      const updates = {
        degree,
        department,
        college,
        grad_year: grad_year ? parseInt(grad_year) : null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        interests: interests || [],
        linkedin_url,
        github_url,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", req.user?.id)
        .select()
        .single();

      if (profileErr) throw profileErr;

      // 2. Write to academic_details table as well
      const { error: academicError } = await supabaseAdmin
        .from("academic_details")
        .upsert({
          user_id: req.user?.id,
          degree,
          department,
          college,
          grad_year: grad_year ? parseInt(grad_year) : null,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          updated_at: new Date().toISOString(),
        });

      if (academicError) {
        throw academicError;
      }

      // 3. Bulk insert skills if provided
      if (skills && Array.isArray(skills) && skills.length > 0) {
        const skillsData = skills.map((skillName: string) => ({
          name: skillName,
          category: "General",
          level: "Intermediate",
          progress: 60,
          user_id: req.user?.id,
        }));

        await supabaseAdmin.from("skills").insert(skillsData);
      }

      return res.json(profile);
    } catch (err: any) {
      console.error("Profile Complete Error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to complete profile" });
    }
  },
);

// =========================================================================
// 8. COMPLETE ONBOARDING
// =========================================================================
router.post(
  "/onboarding/complete",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { category, score } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // 1. Save Skill Assessment
      let assessmentScore = 0;
      if (category && score !== undefined) {
        assessmentScore = parseInt(score);
        await supabaseAdmin.from("assessments").insert({
          user_id: userId,
          category,
          score: assessmentScore,
          completed_at: new Date().toISOString(),
        });
      }

      // 2. Fetch User Profile & Resume & Assessments
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr) throw profileErr;

      const { data: resume } = await supabaseAdmin
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: assessments } = await supabaseAdmin
        .from("assessments")
        .select("*")
        .eq("user_id", userId);

      const userAssessments = assessments || [];

      // 3. Compute Career DNA
      const progScore =
        userAssessments?.find((a) => a.category.toLowerCase().includes("prog"))
          ?.score ??
        assessmentScore ??
        80;
      const dbScore =
        userAssessments?.find(
          (a) =>
            a.category.toLowerCase().includes("db") ||
            a.category.toLowerCase().includes("data"),
        )?.score ??
        assessmentScore ??
        75;
      const aiScore =
        userAssessments?.find(
          (a) =>
            a.category.toLowerCase().includes("ai") ||
            a.category.toLowerCase().includes("ml"),
        )?.score ??
        assessmentScore ??
        70;
      const cloudScore =
        userAssessments?.find((a) => a.category.toLowerCase().includes("cloud"))
          ?.score ??
        assessmentScore ??
        70;
      const webScore =
        userAssessments?.find((a) => a.category.toLowerCase().includes("web"))
          ?.score ??
        assessmentScore ??
        75;
      const aptScore =
        userAssessments?.find((a) => a.category.toLowerCase().includes("apt"))
          ?.score ??
        assessmentScore ??
        80;

      let archetype = "The Algorithmic Architect";
      let tagline =
        "Highly analytical and detail-oriented, with a natural talent for abstract system designing.";

      if (webScore > progScore && webScore > aiScore) {
        archetype = "The Interface Virtuoso";
        tagline =
          "Visually creative and systems-savvy, bringing user interfaces to life with elegant designs.";
      } else if (aiScore > progScore && aiScore > webScore) {
        archetype = "The Cognitive Scientist";
        tagline =
          "Intrigued by neural systems, pattern matching, and predicting future trends from complex data models.";
      } else if (dbScore > progScore && dbScore > webScore) {
        archetype = "The Schema Strategist";
        tagline =
          "Optimizing data stores, pipelines, and indexes for speed and reliable data processing.";
      }

      const maxTech = Math.max(
        progScore,
        dbScore,
        aiScore,
        webScore,
        cloudScore,
      );
      const leadershipScore = profile.cgpa
        ? Math.min(100, Math.round(Number(profile.cgpa) * 10) + 15)
        : 70;

      const dimensions = [
        { subject: "Analytical Thinking", val: aptScore, angle: 0 },
        { subject: "Creative Problem Solving", val: progScore, angle: 60 },
        { subject: "System Architecture", val: cloudScore, angle: 120 },
        { subject: "Adaptability", val: 80, angle: 180 },
        { subject: "Technical Expertise", val: maxTech, angle: 240 },
        {
          subject: "Collaborative Leadership",
          val: leadershipScore,
          angle: 300,
        },
      ];

      const strengths = [
        `Excellent core technical capability in ${profile.degree || "Engineering"} domains.`,
        `Strong analytical skills verified by assessment scores.`,
        `Detail-oriented system mapping capabilities.`,
      ];

      const weaknesses = [
        "Can focus heavily on details rather than pushing out simple mvp products.",
        "Requires additional experience presenting data reports to non-technical partners.",
        "Tends to work best in individual flow states rather than sync reviews.",
      ];

      const recommendedEnvironments = [
        "Research labs / R&D Quantitative divisions",
        "Fast scaling product startups",
        "Distributed systems and platform infrastructure teams",
      ];

      // Save Career DNA
      await supabaseAdmin.from("career_dna").upsert({
        user_id: userId,
        archetype,
        tagline,
        dimensions,
        strengths,
        weaknesses,
        recommended_environments: recommendedEnvironments,
      });

      // 4. Compute Employability Score
      const atsScore = resume?.ats_score || 75;
      const certsCount = resume?.certifications?.length || 1;
      const certScore = Math.min(100, 50 + certsCount * 15);

      // Normalize CGPA
      let cgpaScore = 80;
      if (profile.cgpa) {
        const parsedCgpa = parseFloat(profile.cgpa);
        if (parsedCgpa <= 4.0) {
          cgpaScore = Math.round((parsedCgpa / 4.0) * 100);
        } else if (parsedCgpa <= 10.0) {
          cgpaScore = Math.round((parsedCgpa / 10.0) * 100);
        } else {
          cgpaScore = Math.min(100, parsedCgpa);
        }
      }

      const careerDnaScore = Math.round(
        dimensions.reduce((sum, d) => sum + d.val, 0) / dimensions.length,
      );
      const overallScore = Math.round(
        (atsScore + assessmentScore + cgpaScore + careerDnaScore) / 4,
      );

      const components = [
        {
          label: "Technical Competence",
          score: assessmentScore,
          status:
            assessmentScore >= 85
              ? "Excellent"
              : assessmentScore >= 60
                ? "Good"
                : "Needs Work",
        },
        {
          label: "Certifications & Credentials",
          score: certScore,
          status: certScore >= 80 ? "Excellent" : "Needs Work",
        },
        {
          label: "Resume Completeness & Impact",
          score: atsScore,
          status: atsScore >= 80 ? "Good" : "Needs Work",
        },
        {
          label: "Career Personality Match",
          score: careerDnaScore,
          status: "Good",
        },
        {
          label: "Academic Standings",
          score: cgpaScore,
          status: cgpaScore >= 80 ? "Excellent" : "Good",
        },
      ];

      const feedback = [
        `Your technical competence score is at a solid ${assessmentScore}%.`,
        certsCount < 3
          ? "Boost score by completing remaining assignments and obtaining certification badges."
          : "Great job on earning certifications.",
        "Consider publishing 1-2 research notebooks or portfolio websites.",
      ];

      // Save Employability Score
      await supabaseAdmin.from("employability_scores").upsert({
        user_id: userId,
        overall_score: overallScore,
        components,
        feedback,
      });

      // 5. Update Profile
      await supabaseAdmin
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);

      return res.json({
        success: true,
        overallScore,
        atsScore,
        assessmentScore,
        careerDnaScore,
        archetype,
      });
    } catch (err: any) {
      console.error("Onboarding Complete Error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to complete onboarding" });
    }
  },
);

// =========================================================================
// 9. UPDATE PROFILE
// =========================================================================
router.put(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { name, phone, degree, department, college, linkedin_url, github_url, headline, title, bio, location, target_role, targetRole, avatar } = req.body;

    try {
      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone;
      if (degree !== undefined) updates.degree = degree;
      if (department !== undefined) updates.department = department;
      if (college !== undefined) updates.college = college;
      if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url;
      if (github_url !== undefined) updates.github_url = github_url;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", req.user?.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      // Synchronize Supabase Auth user_metadata to prevent stale name discrepancies
      if (name && req.user?.id) {
        await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
          user_metadata: { name: name.trim() },
        }).catch((e) => console.warn("Failed to sync auth user_metadata name:", e.message));
      }

      // Persist extended profile metadata (headline, bio, title, location, target_role) in user_activity
      const { data: existingMeta } = await supabaseAdmin
        .from("user_activity")
        .select("id, metadata")
        .eq("user_id", req.user?.id)
        .eq("action", "profile_meta")
        .maybeSingle();

      const mergedMeta = {
        ...(existingMeta?.metadata || {}),
        ...(headline !== undefined ? { headline } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(target_role !== undefined ? { target_role } : targetRole !== undefined ? { target_role: targetRole } : {}),
      };

      if (existingMeta) {
        await supabaseAdmin
          .from("user_activity")
          .update({ metadata: mergedMeta })
          .eq("id", existingMeta.id);
      } else {
        await supabaseAdmin.from("user_activity").insert({
          user_id: req.user?.id,
          action: "profile_meta",
          metadata: mergedMeta,
        });
      }

      return res.json({
        ...data,
        name: data?.name || (name ? name.trim() : undefined),
        headline: mergedMeta.headline || mergedMeta.title || "Professional",
        title: mergedMeta.title || mergedMeta.headline || "Professional",
        bio: mergedMeta.bio || "",
        location: mergedMeta.location || "Remote",
        target_role: mergedMeta.target_role || "Software Engineer",
        targetRole: mergedMeta.target_role || "Software Engineer",
        avatar: avatar || "",
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to update profile" });
    }
  },
);

// =========================================================================
// 10. DELETE ACCOUNT
// =========================================================================
router.delete("/account", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Delete profile and related records
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_activity").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_courses").delete().eq("user_id", userId);
    await supabaseAdmin.from("skills").delete().eq("user_id", userId);
    await supabaseAdmin.from("resumes").delete().eq("user_id", userId);
    await supabaseAdmin.from("ats_reports").delete().eq("user_id", userId);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Delete from Supabase Auth admin
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return res.json({ message: "Account deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to delete account" });
  }
});

// =========================================================================
// 11. CONNECTED ACCOUNTS
// =========================================================================
const DEFAULT_CONNECTED_ACCOUNTS = [
  { name: "Google", desc: "alex@gmail.com", color: "bg-gradient-pink", connected: true },
  { name: "GitHub", desc: "@alexcodes", color: "bg-gradient-primary", connected: true },
  { name: "LinkedIn", desc: "Connect for insights", color: "bg-gradient-blue", connected: false },
  { name: "Apple", desc: "Sign in with Apple", color: "bg-gradient-primary", connected: false },
  { name: "Slack", desc: "Team notifications", color: "bg-gradient-pink", connected: false },
];

router.get("/connected-accounts", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: activity } = await supabaseAdmin
      .from("user_activity")
      .select("metadata")
      .eq("user_id", userId)
      .eq("action", "connected_accounts")
      .maybeSingle();

    if (activity?.metadata?.accounts) {
      return res.json(activity.metadata.accounts);
    }
  } catch {
    // ignore
  }

  return res.json(DEFAULT_CONNECTED_ACCOUNTS);
});

router.post("/connected-accounts/toggle", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { provider } = req.body;
  if (!provider) return res.status(400).json({ message: "Provider is required" });

  try {
    const { data: activity } = await supabaseAdmin
      .from("user_activity")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("action", "connected_accounts")
      .maybeSingle();

    let accounts = activity?.metadata?.accounts || DEFAULT_CONNECTED_ACCOUNTS;
    accounts = accounts.map((a: any) =>
      a.name.toLowerCase() === provider.toLowerCase()
        ? { ...a, connected: !a.connected, desc: !a.connected ? `Connected as ${req.user?.email || "User"}` : `Connect for insights` }
        : a
    );

    if (activity) {
      await supabaseAdmin
        .from("user_activity")
        .update({ metadata: { accounts } })
        .eq("id", activity.id);
    } else {
      await supabaseAdmin.from("user_activity").insert({
        user_id: userId,
        action: "connected_accounts",
        metadata: { accounts },
      });
    }

    return res.json(accounts);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to toggle connected account" });
  }
});

export default router;
