import express, { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Extends Request to include user set by authMiddleware
interface AuthRequest extends Request {
  user?: any;
}

// =========================================================================
// 1. GET ALL CANDIDATES (With basic filters)
// =========================================================================
router.get(
  "/candidates",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { skills, min_experience } = req.query;
    const filterSkills = skills
      ? (skills as string).split(",").map((s) => s.toLowerCase().trim())
      : [];
    const filterExp = min_experience ? parseInt(min_experience as string) : 0;

    try {
      // We fetch all profiles (except the recruiter themselves)
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, avatar_url, current_job_title")
        .neq("id", userId);

      if (pErr) throw pErr;

      // We fetch all resumes to merge with profiles
      const { data: resumes, error: rErr } = await supabaseAdmin
        .from("resumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (rErr) throw rErr;

      // Group resumes by user to only consider their latest
      const latestResumes: Record<string, any> = {};
      for (const r of resumes || []) {
        if (!latestResumes[r.user_id]) {
          latestResumes[r.user_id] = r;
        }
      }

      let candidates = profiles.map((p: any) => {
        const resume = latestResumes[p.id];

        // Calculate total experience roughly from resume experience array
        let totalExpYears = 0;
        if (resume && resume.experience && Array.isArray(resume.experience)) {
          totalExpYears = resume.experience.length; // rough estimate: 1 job = 1 year, for mock purposes
          // Real implementation would calculate date diffs
        }

        return {
          ...p,
          ats_score: resume?.ats_score || 0,
          skills: resume?.skills || [],
          experience_years: totalExpYears || 0,
          latest_resume_id: resume?.id,
        };
      });

      // Apply Filters
      if (filterSkills.length > 0) {
        candidates = candidates.filter((c: any) =>
          filterSkills.every((fs) =>
            c.skills.some((cs: string) => cs.toLowerCase().includes(fs)),
          ),
        );
      }

      if (filterExp > 0) {
        candidates = candidates.filter(
          (c: any) => c.experience_years >= filterExp,
        );
      }

      // Check which ones are already shortlisted by this recruiter
      const { data: shortlists } = await supabaseAdmin
        .from("recruiter_shortlists")
        .select("candidate_id")
        .eq("recruiter_id", userId);

      const shortlistedSet = new Set(
        shortlists?.map((s: any) => s.candidate_id) || [],
      );

      const enrichedCandidates = candidates.map((c: any) => ({
        ...c,
        is_shortlisted: shortlistedSet.has(c.id),
      }));

      return res.json(enrichedCandidates);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      return res.status(500).json({ message: "Failed to fetch candidates." });
    }
  },
);

// =========================================================================
// 2. TOGGLE SHORTLIST
// =========================================================================
router.post(
  "/shortlist",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { candidateId } = req.body;
    if (!candidateId)
      return res.status(400).json({ message: "candidateId is required" });

    try {
      // Check if already shortlisted
      const { data: existing } = await supabaseAdmin
        .from("recruiter_shortlists")
        .select("id")
        .eq("recruiter_id", userId)
        .eq("candidate_id", candidateId)
        .single();

      if (existing) {
        // Remove it
        await supabaseAdmin
          .from("recruiter_shortlists")
          .delete()
          .eq("id", existing.id);
        return res.json({ shortlisted: false });
      } else {
        // Add it
        await supabaseAdmin.from("recruiter_shortlists").insert({
          recruiter_id: userId,
          candidate_id: candidateId,
        });
        return res.json({ shortlisted: true });
      }
    } catch (err) {
      console.error("Failed to toggle shortlist:", err);
      return res.status(500).json({ message: "Failed to toggle shortlist." });
    }
  },
);

// =========================================================================
// 3. GET SHORTLISTED CANDIDATES
// =========================================================================
router.get(
  "/shortlist",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { data: shortlists, error: sErr } = await supabaseAdmin
        .from("recruiter_shortlists")
        .select("candidate_id")
        .eq("recruiter_id", userId);

      if (sErr) throw sErr;
      if (!shortlists || shortlists.length === 0) return res.json([]);

      const candidateIds = shortlists.map((s: any) => s.candidate_id);

      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, avatar_url, current_job_title")
        .in("id", candidateIds);

      if (pErr) throw pErr;

      // Fetch latest resumes
      const { data: resumes } = await supabaseAdmin
        .from("resumes")
        .select("*")
        .in("user_id", candidateIds)
        .order("created_at", { ascending: false });

      const latestResumes: Record<string, any> = {};
      for (const r of resumes || []) {
        if (!latestResumes[r.user_id]) {
          latestResumes[r.user_id] = r;
        }
      }

      const candidates = profiles.map((p: any) => {
        const resume = latestResumes[p.id];
        let totalExpYears = 0;
        if (resume && resume.experience && Array.isArray(resume.experience)) {
          totalExpYears = resume.experience.length;
        }

        return {
          ...p,
          ats_score: resume?.ats_score || 0,
          skills: resume?.skills || [],
          experience_years: totalExpYears || 0,
          latest_resume_id: resume?.id,
          is_shortlisted: true,
        };
      });

      return res.json(candidates);
    } catch (err) {
      console.error("Failed to fetch shortlists:", err);
      return res.status(500).json({ message: "Failed to fetch shortlists." });
    }
  },
);

export default router;
