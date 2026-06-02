import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// GET USER SUBSCRIPTION
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", req.user?.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return res.json({
        plan: data.plan,
        status: data.status,
        endDate: data.end_date
      });
    } else {
      // Seed a default 'Pro' subscription if none exists for the user
      const endDate = new Date(Date.now() + 30 * 86400000).toISOString();
      const { data: newSub } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: req.user?.id,
          plan: "Pro",
          status: "active",
          end_date: endDate
        })
        .select()
        .single();
        
      if (newSub) {
        return res.json({
          plan: newSub.plan,
          status: newSub.status,
          endDate: newSub.end_date
        });
      }
    }
  } catch (err: any) {
    console.error("Supabase Subscriptions Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve subscription plan" });
  }

  return res.json({
    plan: "Free",
    status: "active",
    endDate: null
  });
});

// =========================================================================
// UPGRADE SUBSCRIPTION PLAN
// =========================================================================
router.post("/upgrade", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body;
  const endDate = new Date(Date.now() + 30 * 86400000).toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: req.user?.id,
        plan: plan || "Pro",
        status: "active",
        end_date: endDate,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      plan: data.plan,
      status: data.status,
      endDate: data.end_date
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to upgrade subscription" });
  }
});

export default router;
