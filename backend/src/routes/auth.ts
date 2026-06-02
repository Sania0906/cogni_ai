import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabase, supabaseAdmin } from "../config/supabase";

const router = Router();

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// =========================================================================
// 1. SIGNUP
// =========================================================================
router.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    console.log(`[Supabase Auth] Registering user: ${formattedEmail}`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "user"
      }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // If the database trigger fails or RLS needs manual sync, write profile using service role
    if (data.user) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: data.user.id,
            name,
            email: formattedEmail,
            role: "user"
          });
        if (profileError) {
          console.warn("[Supabase Profiles] Profile sync warning:", profileError.message);
        }
      } catch (syncErr) {
        console.warn("[Supabase Profiles] Profile sync warning:", syncErr);
      }
    }

    return res.status(201).json({
      message: "Registration successful! You can now log in immediately.",
      email: formattedEmail
    });
  } catch (err: any) {
    console.error("Supabase Signup Exception:", err);
    return res.status(500).json({ message: err.message || "Internal server error during registration" });
  }
});

// =========================================================================
// 2. LOGIN
// =========================================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password
    });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("confirm") || errMsg.includes("verified") || error.status === 400 && errMsg.includes("email")) {
        return res.status(403).json({
          message: "Email is not verified. Please check your email for the confirmation link or disable email confirmation in your Supabase dashboard settings.",
          unverified: true,
          email: formattedEmail
        });
      }
      return res.status(400).json({ message: error.message });
    }

    // Fetch user profile info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.user?.id)
      .maybeSingle();

    return res.json({
      token: data.session?.access_token,
      user: {
        id: data.user?.id,
        name: profile?.name || data.user?.user_metadata?.name || formattedEmail.split("@")[0],
        email: data.user?.email,
        role: profile?.role || "user"
      }
    });
  } catch (err: any) {
    console.error("Supabase Login Exception:", err);
    return res.status(500).json({ message: err.message || "Internal server error during login" });
  }
});

// =========================================================================
// 3. SEND OTP (FORGOT PASSWORD BADGE)
// =========================================================================
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(formattedEmail);
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    return res.json({
      message: "Password reset verification code sent to email",
      email: formattedEmail
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to send reset code" });
  }
});

// =========================================================================
// 4. VERIFY OTP
// =========================================================================
router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: formattedEmail,
      token: code,
      type: "recovery"
    });

    if (error || !data.user) {
      return res.status(400).json({ message: error?.message || "Invalid or expired reset code" });
    }

    return res.json({
      message: "Code verified successfully.",
      token: data.session?.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: "user"
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Verification failed" });
  }
});

// =========================================================================
// 5. FORGOT PASSWORD
// =========================================================================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(formattedEmail);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: "Password reset verification code sent to email",
      email: formattedEmail
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to send reset code" });
  }
});

// =========================================================================
// 6. RESET PASSWORD
// =========================================================================
router.post("/reset-password", async (req, res) => {
  const { email, code, password, confirmPassword } = req.body;

  if (!email || !code || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    // 1. Verify code
    const { data, error } = await supabase.auth.verifyOtp({
      email: formattedEmail,
      token: code,
      type: "recovery"
    });

    if (error || !data.user) {
      return res.status(400).json({ message: error?.message || "Invalid or expired reset code" });
    }

    // 2. Use admin client to override password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      password
    });

    if (updateError) {
      return res.status(400).json({ message: updateError.message });
    }

    return res.json({ message: "Password has been reset successfully." });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to reset password" });
  }
});

// =========================================================================
// 7. GET PROFILE
// =========================================================================
router.get("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
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

      return res.json({
        ...data,
        academicDetails: acadData || null,
        resumeDetails: resumeData || null
      });
    }
    
    return res.status(404).json({ message: "Profile not found" });
  } catch (err: any) {
    console.error("Supabase Profile Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve profile" });
  }
});

// =========================================================================
// 8. COMPLETE PROFILE (ONBOARDING)
// =========================================================================
router.post("/profile/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { degree, department, college, grad_year, cgpa, interests, linkedin_url, github_url, skills, certifications } = req.body;

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
      onboarding_completed: false,
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", req.user?.id)
      .select()
      .single();

    if (profileErr) throw profileErr;

    // 2. Write to academic_details table as well
    await supabaseAdmin
      .from("academic_details")
      .upsert({
        user_id: req.user?.id,
        degree,
        department,
        college,
        grad_year: grad_year ? parseInt(grad_year) : null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        updated_at: new Date().toISOString()
      });

    // 3. Insert skills if provided
    if (skills && Array.isArray(skills)) {
      for (const skillName of skills) {
        // Query to check if skill already exists
        const { data: existingSkill } = await supabaseAdmin
          .from("skills")
          .select("*")
          .eq("user_id", req.user?.id)
          .eq("name", skillName)
          .maybeSingle();

        if (!existingSkill) {
          await supabaseAdmin.from("skills").insert({
            name: skillName,
            category: "General",
            level: "Intermediate",
            progress: 60,
            user_id: req.user?.id
          });
        }
      }
    }

    return res.json(profile);
  } catch (err: any) {
    console.error("Profile Complete Error:", err);
    return res.status(500).json({ message: err.message || "Failed to complete profile" });
  }
});

// =========================================================================
// 8b. COMPLETE ONBOARDING
// =========================================================================
router.post("/onboarding/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
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
      await supabaseAdmin
        .from("assessments")
        .insert({
          user_id: userId,
          category,
          score: assessmentScore,
          completed_at: new Date().toISOString()
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
    const progScore = userAssessments?.find(a => a.category.toLowerCase().includes("prog"))?.score || assessmentScore || 80;
    const dbScore = userAssessments?.find(a => a.category.toLowerCase().includes("db") || a.category.toLowerCase().includes("data"))?.score || assessmentScore || 75;
    const aiScore = userAssessments?.find(a => a.category.toLowerCase().includes("ai") || a.category.toLowerCase().includes("ml"))?.score || assessmentScore || 70;
    const cloudScore = userAssessments?.find(a => a.category.toLowerCase().includes("cloud"))?.score || assessmentScore || 70;
    const webScore = userAssessments?.find(a => a.category.toLowerCase().includes("web"))?.score || assessmentScore || 75;
    const aptScore = userAssessments?.find(a => a.category.toLowerCase().includes("apt"))?.score || assessmentScore || 80;

    let archetype = "The Algorithmic Architect";
    let tagline = "Highly analytical and detail-oriented, with a natural talent for abstract system designing.";
    
    if (webScore > progScore && webScore > aiScore) {
      archetype = "The Interface Virtuoso";
      tagline = "Visually creative and systems-savvy, bringing user interfaces to life with elegant designs.";
    } else if (aiScore > progScore && aiScore > webScore) {
      archetype = "The Cognitive Scientist";
      tagline = "Intrigued by neural systems, pattern matching, and predicting future trends from complex data models.";
    } else if (dbScore > progScore && dbScore > webScore) {
      archetype = "The Schema Strategist";
      tagline = "Optimizing data stores, pipelines, and indexes for speed and reliable data processing.";
    }

    const maxTech = Math.max(progScore, dbScore, aiScore, webScore, cloudScore);
    const leadershipScore = profile.cgpa ? Math.min(100, Math.round(Number(profile.cgpa) * 10) + 15) : 70;

    const dimensions = [
      { subject: "Analytical Thinking", val: aptScore, angle: 0 },
      { subject: "Creative Problem Solving", val: progScore, angle: 60 },
      { subject: "System Architecture", val: cloudScore, angle: 120 },
      { subject: "Adaptability", val: 80, angle: 180 },
      { subject: "Technical Expertise", val: maxTech, angle: 240 },
      { subject: "Collaborative Leadership", val: leadershipScore, angle: 300 },
    ];

    const strengths = [
      `Excellent core technical capability in ${profile.degree || "Engineering"} domains.`,
      `Strong analytical skills verified by assessment scores.`,
      `Detail-oriented system mapping capabilities.`
    ];

    const weaknesses = [
      "Can focus heavily on details rather than pushing out simple mvp products.",
      "Requires additional experience presenting data reports to non-technical partners.",
      "Tends to work best in individual flow states rather than sync reviews."
    ];

    const recommendedEnvironments = [
      "Research labs / R&D Quantitative divisions",
      "Fast scaling product startups",
      "Distributed systems and platform infrastructure teams"
    ];

    // Save Career DNA
    await supabaseAdmin
      .from("career_dna")
      .upsert({
        user_id: userId,
        archetype,
        tagline,
        dimensions,
        strengths,
        weaknesses,
        recommended_environments: recommendedEnvironments
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

    const careerDnaScore = Math.round(dimensions.reduce((sum, d) => sum + d.val, 0) / dimensions.length);
    const overallScore = Math.round((atsScore + assessmentScore + cgpaScore + careerDnaScore) / 4);

    const components = [
      { label: "Technical Competence", score: assessmentScore, status: assessmentScore >= 85 ? "Excellent" : assessmentScore >= 60 ? "Good" : "Needs Work" },
      { label: "Certifications & Credentials", score: certScore, status: certScore >= 80 ? "Excellent" : "Needs Work" },
      { label: "Resume Completeness & Impact", score: atsScore, status: atsScore >= 80 ? "Good" : "Needs Work" },
      { label: "Career Personality Match", score: careerDnaScore, status: "Good" },
      { label: "Academic Standings", score: cgpaScore, status: cgpaScore >= 80 ? "Excellent" : "Good" }
    ];

    const feedback = [
      `Your technical competence score is at a solid ${assessmentScore}%.`,
      certsCount < 3 ? "Boost score by completing remaining assignments and obtaining certification badges." : "Great job on earning certifications.",
      "Consider publishing 1-2 research notebooks or portfolio websites."
    ];

    // Save Employability Score
    await supabaseAdmin
      .from("employability_scores")
      .upsert({
        user_id: userId,
        overall_score: overallScore,
        components,
        feedback
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
      archetype
    });
  } catch (err: any) {
    console.error("Onboarding Complete Error:", err);
    return res.status(500).json({ message: err.message || "Failed to complete onboarding" });
  }
});

// =========================================================================
// 9. UPDATE PROFILE
// =========================================================================
router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, title, bio, location, avatar } = req.body;

  try {
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (avatar !== undefined) updates.avatar = avatar;
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

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

export default router;
