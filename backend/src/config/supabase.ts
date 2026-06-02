import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// DEBUG
console.log("=================================");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("ANON KEY FOUND:", !!process.env.SUPABASE_ANON_KEY);
console.log("SERVICE KEY FOUND:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("=================================");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-id") || supabaseAnonKey.includes("your-supabase-anon-key")) {
  throw new Error("CRITICAL CONFIGURATION ERROR: Supabase URL and Anon Key are required for this production application. Fallback mock modes have been disabled.");
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === supabaseAnonKey) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or set to the public anon key. Backend operations requiring RLS bypass (such as profile complete sync and system updates) will fail or be blocked by RLS policies!");
}

// Public client obeying Row Level Security (RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client bypassing Row Level Security (RLS) for system actions
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Checks if Supabase credentials are configured in the environment (always returns true in production mode)
 */
export function isSupabaseConfigured(): boolean {
  return true;
}