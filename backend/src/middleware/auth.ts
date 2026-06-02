import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase, isSupabaseConfigured } from "../config/supabase";

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
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  // If Supabase is configured, verify access token against Supabase Auth service
  if (isSupabaseConfigured()) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ message: "Session is invalid or expired. Please sign in again." });
      }
      req.user = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        role: user.user_metadata?.role || "user",
      };
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Token verification failed" });
    }
  }

  // Fallback to local JWT verification for offline mock mode
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "cognify_jwt_secret_key_12345") as {
      id: string;
      email?: string;
      name?: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
}
