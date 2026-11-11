import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
    role: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      message: "Authentication service is unavailable: database is not configured.",
    });
  }

  // Verify access token against Supabase Auth service
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        message: "Session is invalid or expired. Please sign in again.",
      });
    }

    // Query trusted profile record from database to obtain the real role (never trust 'admin' from user_metadata)
    let trustedRole = "user";
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        trustedRole = profile.role;
      } else if (
        user.user_metadata?.role === "organization" ||
        user.user_metadata?.role === "recruiter"
      ) {
        trustedRole = user.user_metadata.role;
      }
    } catch (_) {
      trustedRole = "user";
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name,
      role: trustedRole,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token verification failed" });
  }
}

/**
 * Role authorization guard middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Normalizes 'organization' and 'recruiter' as interchangeable partner roles.
 * Admin role is universally permitted.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Valid token required." });
    }

    const userRole = (req.user.role || "user").toLowerCase().trim();

    // Admins always have access
    if (userRole === "admin") {
      return next();
    }

    const isAuthorized = allowedRoles.some((role) => {
      const targetRole = role.toLowerCase().trim();
      if (targetRole === userRole) return true;
      // Allow recruiter and organization interchangeably
      if (
        (targetRole === "organization" || targetRole === "recruiter") &&
        (userRole === "organization" || userRole === "recruiter")
      ) {
        return true;
      }
      return false;
    });

    if (!isAuthorized) {
      return res.status(403).json({
        message: `Access denied. Endpoint requires one of: [${allowedRoles.join(", ")}]. Current role: '${userRole}'.`,
      });
    }

    return next();
  };
}
