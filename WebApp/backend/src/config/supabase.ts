import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv environment variables from backend/.env first, then root WebApp/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

/**
 * Validates whether Supabase environment variables are properly configured.
 * Checks for presence, valid URL scheme, and ensures no dummy placeholders are used.
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl) return false;

  const activeKey = supabaseServiceRoleKey || supabaseAnonKey;
  if (!activeKey) return false;

  // Reject placeholder values
  if (
    supabaseUrl.includes("your-project-id") ||
    supabaseUrl.includes("example.com") ||
    activeKey.includes("your-anon-key") ||
    activeKey.includes("your-service-role-key")
  ) {
    return false;
  }

  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Fallback dummy credentials to allow module initialization without crashing,
// while ensuring actual network requests produce explicit configuration errors.
const dummyUrl = "https://unconfigured-project.supabase.co";
const dummyKey = "unconfigured-key";

// Standard Supabase client (client-safe anon context)
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey)
  : createClient(dummyUrl, dummyKey);

// Supabase Admin client with service_role key (server-only administrative context)
export const supabaseAdmin: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient(dummyUrl, dummyKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

