import crypto from "crypto";
import { isSupabaseConfigured, supabaseAdmin } from "../config/supabase.js";

export interface TestAdminContext {
  email: string;
  password: string;
  cleanup: () => Promise<void>;
}

/**
 * Resolves admin credentials from TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD if set,
 * or provisions an ephemeral admin account with runtime-generated credentials and
 * deletes it on cleanup.
 */
export async function resolveTestAdminCredentials(): Promise<TestAdminContext> {
  const envEmail = process.env.TEST_ADMIN_EMAIL?.trim();
  const envPassword = process.env.TEST_ADMIN_PASSWORD?.trim();

  if (envEmail && envPassword) {
    return {
      email: envEmail,
      password: envPassword,
      cleanup: async () => {},
    };
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      "TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD are not set and Supabase is unconfigured for ephemeral admin provisioning."
    );
  }

  const suffix = `${Date.now()}.${crypto.randomBytes(4).toString("hex")}`;
  const email = `temp.admin.${suffix}@example.com`;
  const password = `${crypto.randomBytes(16).toString("hex")}Aa1!`;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: "Automated Verification Admin",
      role: "admin",
    },
  });

  if (createErr || !created.user) {
    throw new Error(`Failed to provision temporary test admin: ${createErr?.message || "Unknown error"}`);
  }

  const userId = created.user.id;
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    name: "Automated Verification Admin",
    email,
    role: "admin",
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(`Failed to upsert temporary test admin profile: ${profileErr.message}`);
  }

  let cleaned = false;
  return {
    email,
    password,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    },
  };
}

