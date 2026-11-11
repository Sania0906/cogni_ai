import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { mlService } from "../services/mlService.js";
import {
  resumeUploadMiddleware,
  extractTextFromUploadedResume,
  uploadResumeToStorage,
  createSignedResumeUrl,
} from "../utils/resumeHelper.js";

const router = Router();

// POST /api/resume/upload
router.post("/upload", authMiddleware, resumeUploadMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { text, fileName } = await extractTextFromUploadedResume(
      req.file,
      req.body?.resumeText || ""
    );

    // Strict empty/invalid document check (do not fabricate dummy resume text)
    if (!text || text.trim().length < 15) {
      return res.status(400).json({
        message: "The uploaded document is empty, corrupted, or contains insufficient readable text (minimum 15 characters).",
      });
    }

    const targetJob = req.body?.targetJob || "Software Engineer";

    // Run ATS scorer, Career Trajectory classifier, and Supabase Storage upload in parallel
    const [atsResult, careerPrediction, storageResult] = await Promise.all([
      mlService.predictATS(text, undefined, targetJob),
      mlService.predictCareer(text).catch(() => null),
      uploadResumeToStorage(userId, req.file),
    ]);

    const detectedSkills = atsResult.all_extracted_skills || atsResult.matched_skills || [];
    const missingSkills = atsResult.missing_required_skills || [];
    const roundedScore = Math.round(atsResult.ats_score);
    const predictedRole = careerPrediction?.predicted_role || atsResult.target_role || targetJob;

    // 1. Save into ats_reports using exact live Supabase schema column names
    let savedReportId = "res_" + Date.now();
    try {
      const { data: reportData, error: reportErr } = await supabaseAdmin
        .from("ats_reports")
        .insert({
          user_id: userId,
          score: roundedScore,
          strengths: detectedSkills.slice(0, 8),
          weaknesses: missingSkills.slice(0, 8),
          recommendations: (atsResult.actionable_recommendations || []).slice(0, 8),
          missing_keywords: missingSkills.slice(0, 10),
          extracted_skills: detectedSkills.slice(0, 15),
          resume_url: fileName,
        })
        .select("id")
        .single();

      if (reportErr) {
        console.warn("ats_reports insert warning:", reportErr.message);
      } else if (reportData?.id) {
        savedReportId = reportData.id;
      }
    } catch (e: any) {
      console.warn("ats_reports insert error:", e?.message);
    }

    // 2. Upsert into resumes for user's active resume tracking (pointing file_url to private Storage path)
    await supabaseAdmin.from("resumes").upsert(
      {
        user_id: userId,
        file_name: fileName,
        file_url: storageResult.fileUrl,
        ats_score: roundedScore,
        parsed_text: text,
        skills: detectedSkills,
        improvements: atsResult.actionable_recommendations || [],
        upload_date: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // 3. Create real database notification for audit completion (matching live schema: is_read)
    try {
      const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "ATS Resume Analysis Complete",
        message: `Your resume (${fileName}) achieved an ATS optimization score of ${roundedScore}% for ${predictedRole}.`,
        is_read: false,
      });
      if (notifErr) {
        console.warn("Notification insert warning:", notifErr.message);
      }
    } catch (notifErr: any) {
      console.warn("Notification creation skipped:", notifErr?.message);
    }

    return res.status(201).json({
      id: savedReportId,
      user_id: userId,
      resume_url: fileName,
      file_name: fileName,
      file_url: storageResult.fileUrl,
      storage_path: storageResult.storagePath,
      storage_persisted: storageResult.persisted,
      ats_score: atsResult.ats_score,
      score: atsResult.ats_score,
      predicted_role: predictedRole,
      detected_skills: detectedSkills,
      skills: detectedSkills,
      strengths: detectedSkills.slice(0, 6),
      missing_skills: missingSkills,
      weaknesses: missingSkills.slice(0, 6),
      created_at: new Date().toISOString(),
      parsedText: text,
      score_breakdown: atsResult.score_breakdown,
      improvements: atsResult.actionable_recommendations,
      recommendations: atsResult.actionable_recommendations,
      target_role: atsResult.target_role,
      source: atsResult.source || "ml_engine",
    });
  } catch (err: any) {
    console.error("Resume Upload Error:", err);
    return res.status(500).json({ message: err.message || "Failed to process resume upload" });
  }
});

// GET /api/resume/signed-url - Generate owner-scoped temporary signed URL for private stored resume
router.get("/signed-url", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data: resume } = await supabaseAdmin
      .from("resumes")
      .select("file_url, file_name")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resume?.file_url) {
      return res.status(404).json({ message: "No stored resume found." });
    }

    const signedUrl = await createSignedResumeUrl(userId, resume.file_url, 300);
    if (!signedUrl) {
      return res.status(404).json({
        message: "Resume file binary is not stored in private object storage.",
        file_url: resume.file_url,
      });
    }

    return res.json({
      signedUrl,
      fileName: resume.file_name,
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to generate signed URL" });
  }
});

// GET /api/resume/history
router.get("/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Query ats_reports first (multi-record audit history)
    const { data: reportsData } = await supabaseAdmin
      .from("ats_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (reportsData && reportsData.length > 0) {
      const mappedReports = reportsData.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        resume_url: r.resume_url || "Resume Audit",
        file_name: r.resume_url || "Resume Audit",
        ats_score: r.score,
        score: r.score,
        detected_skills: r.extracted_skills || r.strengths || [],
        missing_skills: r.missing_keywords || r.weaknesses || [],
        recommendations: r.recommendations || [],
        created_at: r.created_at,
      }));
      return res.json(mappedReports);
    }

    // Fallback to resumes table
    const { data: resumesData } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false });

    const mapped = (resumesData || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      resume_url: r.file_name,
      file_name: r.file_name,
      ats_score: r.ats_score,
      score: r.ats_score,
      detected_skills: r.skills || [],
      missing_skills: [],
      recommendations: r.improvements || [],
      created_at: r.upload_date || r.created_at,
    }));

    return res.json(mapped);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch resume history" });
  }
});

export default router;
