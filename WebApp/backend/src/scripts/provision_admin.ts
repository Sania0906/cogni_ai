import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { supabaseAdmin, isSupabaseConfigured, findAuthUserByEmail } from "../config/supabase.js";

const DISALLOWED_ADMIN_PASSWORDS = new Set([
  "adminpass123!",
  "password123",
  "password123!",
  "password123456",
  "changeme123!",
  "admin123456!",
]);

export interface AdminProvisionConfig {
  email: string;
  password: string;
  name: string;
}

/**
 * Validates that an administrator password meets complexity requirements and does not
 * use any known weak or legacy default value.
 */
export function validateStrongAdminPassword(password: string): void {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("Admin password is required via CLI argument <password> or ADMIN_PASSWORD.");
  }
  if (trimmed.length < 12) {
    throw new Error("Admin password must be at least 12 characters long.");
  }
  if (DISALLOWED_ADMIN_PASSWORDS.has(trimmed.toLowerCase())) {
    throw new Error("Admin password must not use a known placeholder or default credential.");
  }
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasDigit = /\d/.test(trimmed);
  const hasSymbol = /[^A-Za-z0-9]/.test(trimmed);
  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    throw new Error(
      "Admin password must contain uppercase, lowercase, numeric, and special characters."
    );
  }
}

/**
 * Resolves and validates explicit administrator provisioning parameters from CLI args or env.
 */
export function resolveAdminConfig(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): AdminProvisionConfig {
  const email = (argv[2] || env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = (argv[3] || env.ADMIN_PASSWORD || "").trim();
  const name = (argv[4] || env.ADMIN_NAME || "System Administrator").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Valid admin email is required via CLI argument <email> or ADMIN_EMAIL environment variable."
    );
  }

  validateStrongAdminPassword(password);

  return {
    email,
    password,
    name: name || "System Administrator",
  };
}

export async function provisionAdmin(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  let config: AdminProvisionConfig;
  try {
    config = resolveAdminConfig(argv, env);
  } catch (err: any) {
    console.error(`[Admin Provisioning ERROR]: ${err.message}`);
    console.error(
      "Usage: tsx WebApp/backend/src/scripts/provision_admin.ts <ADMIN_EMAIL> <STRONG_PASSWORD> [ADMIN_NAME]"
    );
    process.exit(1);
  }

  const { email, password, name } = config;
  console.log(`[Admin Provisioning] Initializing for target: ${email}...`);

  if (!isSupabaseConfigured()) {
    console.error("[Admin Provisioning ERROR]: Supabase is not properly configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  try {
    // 1. Check if user exists in auth.users across paginated pages
    const existingUser = await findAuthUserByEmail(email);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[Admin Provisioning] Existing auth user found (${userId}). Elevating privileges...`);
      
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "admin",
        },
      });

      if (updateErr) {
        throw new Error(`Failed to update auth user: ${updateErr.message}`);
      }
    } else {
      console.log(`[Admin Provisioning] Creating new administrative auth user...`);
      const { data: createRes, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "admin",
        },
      });

      if (createErr || !createRes.user) {
        throw new Error(`Failed to create admin user: ${createErr?.message}`);
      }

      userId = createRes.user.id;
    }

    // 2. Upsert admin record into public.profiles
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        name,
        email,
        role: "admin",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      throw new Error(`Failed to update admin profile in database: ${profileErr.message}`);
    }

    console.log(`=======================================================`);
    console.log(`[Admin Provisioning SUCCESS]`);
    console.log(`User ID:  ${userId}`);
    console.log(`Email:    ${email}`);
    console.log(`Role:     admin`);
    console.log(`Verified: true`);
    console.log(`=======================================================`);
    process.exit(0);
  } catch (err: any) {
    console.error(`[Admin Provisioning FAILED]:`, err.message);
    process.exit(1);
  }
}

const isDirectEntry =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectEntry) {
  provisionAdmin();
}
