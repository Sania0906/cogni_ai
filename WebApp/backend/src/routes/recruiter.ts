import express, { Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth.js";
import { mlService } from "../services/mlService.js";

const router = express.Router();

// =========================================================================
// 1. GET ALL CANDIDATES (With basic filters)
// =========================================================================
router.get(
  "/candidates",
  authMiddleware,
  requireRole("organization", "recruiter", "admin"),
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { skills, min_experience } = req.query;
    const filterSkills = skills
      ? (skills as string).split(",").map((s) => s.toLowerCase().trim())
      : [];
    const filterExp = min_experience ? parseInt(min_experience as string) : 0;

    try {
      // Fetch strictly candidate/student profiles (enforce isolation from admin/rival organization accounts)
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, degree, department, role")
        .eq("role", "user")
        .neq("id", userId);

      if (pErr) throw pErr;

      // We fetch all resumes and user skills to merge with profiles
      const [{ data: resumes, error: rErr }, { data: allSkills }] = await Promise.all([
        supabaseAdmin
          .from("resumes")
          .select("*")
          .order("upload_date", { ascending: false }),
        supabaseAdmin.from("skills").select("user_id, name"),
      ]);

      if (rErr) throw rErr;

      // Group resumes and skills by user
      const latestResumes: Record<string, any> = {};
      for (const r of resumes || []) {
        if (!latestResumes[r.user_id]) {
          latestResumes[r.user_id] = r;
        }
      }

      const skillsByUser: Record<string, string[]> = {};
      for (const s of allSkills || []) {
        if (!skillsByUser[s.user_id]) skillsByUser[s.user_id] = [];
        if (s.name) skillsByUser[s.user_id].push(s.name);
      }

      let candidates = (profiles || []).map((p: any) => {
        const resume = latestResumes[p.id];

        // Calculate total experience roughly from resume experience array
        let totalExpYears = 0;
        if (resume && resume.experience && Array.isArray(resume.experience)) {
          totalExpYears = resume.experience.length;
        }

        const atsScore = typeof resume?.ats_score === "number" ? resume.ats_score : 0;
        const candidateSkills =
          resume?.skills && Array.isArray(resume.skills) && resume.skills.length > 0
            ? resume.skills
            : skillsByUser[p.id] || [];
        const targetRole = p.department
          ? `${p.department} Specialist`
          : p.degree
            ? `${p.degree} Engineer`
            : "Software Engineer";

        return {
          ...p,
          avatar_url: "",
          target_role: targetRole,
          current_job_title: targetRole,
          match_score: atsScore,
          employability_score: atsScore,
          ats_score: atsScore,
          skills: candidateSkills,
          experience_years: totalExpYears,
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

      // Dynamic ML Matching if target role is queried
      const roleFilter = req.query.role as string | undefined;
      if (roleFilter && candidates.length > 0) {
        try {
          const candidatePayload = candidates.map((c) => ({
            id: c.id,
            name: c.name,
            resume_text: latestResumes[c.id]?.parsed_text || c.skills.join(", "),
          }));
          const mlRanked = await mlService.scoreCandidates(candidatePayload, roleFilter);
          const scoreMap = new Map(mlRanked.ranked_candidates.map((r) => [r.candidate_id, r]));
          candidates = candidates.map((c) => {
            const ranked = scoreMap.get(c.id);
            if (ranked) {
              return {
                ...c,
                match_score: ranked.ats_score,
                ats_score: ranked.ats_score,
                skills: ranked.all_extracted_skills.length > 0 ? ranked.all_extracted_skills : c.skills,
              };
            }
            return c;
          });
          candidates.sort((a, b) => b.match_score - a.match_score);
        } catch (scoreErr) {
          console.warn("[Recruiter] ML dynamic scoring warning:", scoreErr);
        }
      }

      // Check which ones are already shortlisted by this recruiter
      const { data: shortlists } = await supabaseAdmin
        .from("user_activity")
        .select("metadata")
        .eq("user_id", userId)
        .eq("action", "recruiter_shortlist");

      const shortlistedSet = new Set(
        shortlists?.map((s: any) => s.metadata?.candidate_id).filter(Boolean) || [],
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
  requireRole("organization", "recruiter", "admin"),
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { candidateId } = req.body;
    if (!candidateId)
      return res.status(400).json({ message: "candidateId is required" });

    try {
      // Check if already shortlisted
      const { data: shortlists } = await supabaseAdmin
        .from("user_activity")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("action", "recruiter_shortlist");

      const existing = shortlists?.find((s: any) => s.metadata?.candidate_id === candidateId);

      if (existing) {
        // Remove it
        await supabaseAdmin
          .from("user_activity")
          .delete()
          .eq("id", existing.id);
        return res.json({ shortlisted: false });
      } else {
        // Add it
        await supabaseAdmin.from("user_activity").insert({
          user_id: userId,
          action: "recruiter_shortlist",
          metadata: { candidate_id: candidateId },
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
  requireRole("organization", "recruiter", "admin"),
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { data: shortlists, error: sErr } = await supabaseAdmin
        .from("user_activity")
        .select("metadata")
        .eq("user_id", userId)
        .eq("action", "recruiter_shortlist");

      if (sErr) throw sErr;
      if (!shortlists || shortlists.length === 0) return res.json([]);

      const candidateIds = shortlists.map((s: any) => s.metadata?.candidate_id).filter(Boolean);
      if (candidateIds.length === 0) return res.json([]);

      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, degree, department, role")
        .in("id", candidateIds);

      if (pErr) throw pErr;

      // Fetch latest resumes & skills
      const [{ data: resumes }, { data: allSkills }] = await Promise.all([
        supabaseAdmin
          .from("resumes")
          .select("*")
          .in("user_id", candidateIds)
          .order("upload_date", { ascending: false }),
        supabaseAdmin.from("skills").select("user_id, name").in("user_id", candidateIds),
      ]);

      const latestResumes: Record<string, any> = {};
      for (const r of resumes || []) {
        if (!latestResumes[r.user_id]) {
          latestResumes[r.user_id] = r;
        }
      }

      const skillsByUser: Record<string, string[]> = {};
      for (const s of allSkills || []) {
        if (!skillsByUser[s.user_id]) skillsByUser[s.user_id] = [];
        if (s.name) skillsByUser[s.user_id].push(s.name);
      }

      const candidates = (profiles || []).map((p: any) => {
        const resume = latestResumes[p.id];
        let totalExpYears = 0;
        if (resume && resume.experience && Array.isArray(resume.experience)) {
          totalExpYears = resume.experience.length;
        }

        const atsScore = typeof resume?.ats_score === "number" ? resume.ats_score : 0;
        const candidateSkills =
          resume?.skills && Array.isArray(resume.skills) && resume.skills.length > 0
            ? resume.skills
            : skillsByUser[p.id] || [];
        const targetRole = p.current_job_title || "Software Engineer";

        return {
          ...p,
          target_role: targetRole,
          current_job_title: targetRole,
          match_score: atsScore,
          employability_score: atsScore,
          ats_score: atsScore,
          skills: candidateSkills,
          experience_years: totalExpYears,
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
