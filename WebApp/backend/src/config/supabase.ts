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

// Standard Supabase client (client-safe anon context, strictly stateless on server)
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
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

export interface PaginatedAuthUsersResponse {
  data: {
    users: Array<{ id: string; email?: string | null; [key: string]: any }>;
    nextPage?: number | null;
    lastPage?: number;
  };
  error: { message: string } | null;
}

/**
 * Searches Supabase Auth users page-by-page using supported pagination parameters.
 * Stops immediately once the target email is matched or all pages are exhausted.
 */
export async function findAuthUserByEmail(
  targetEmail: string,
  listUsersPage: (params: {
    page: number;
    perPage: number;
  }) => Promise<PaginatedAuthUsersResponse> = (params) =>
    supabaseAdmin.auth.admin.listUsers(params) as unknown as Promise<PaginatedAuthUsersResponse>,
  perPage: number = 100
): Promise<{ id: string; email?: string | null; [key: string]: any } | null> {
  const normalizedTarget = targetEmail.toLowerCase().trim();
  const safePerPage =
    Number.isInteger(perPage) && perPage > 0 ? Math.min(perPage, 1000) : 100;
  let page = 1;
  const maxPages = 10_000;

  while (page <= maxPages) {
    const { data, error } = await listUsersPage({ page, perPage: safePerPage });
    if (error) {
      throw new Error(`Failed to list users on page ${page}: ${error.message}`);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((u) => u.email?.toLowerCase().trim() === normalizedTarget);
    if (match) {
      return match;
    }

    if (typeof data?.nextPage === "number" && data.nextPage > page) {
      page = data.nextPage;
      continue;
    }

    if (users.length === 0 || users.length < safePerPage) {
      break;
    }

    if (typeof data?.lastPage === "number" && page >= data.lastPage) {
      break;
    }

    page += 1;
  }

  return null;
}

