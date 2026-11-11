import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";

async function provisionAdmin() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "admin@cognifyai.com").toLowerCase().trim();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || "AdminPass123!";
  const name = process.argv[4] || "System Administrator";

  console.log(`[Admin Provisioning] Initializing for target: ${email}...`);

  if (!isSupabaseConfigured()) {
    console.error("[Admin Provisioning ERROR]: Supabase is not properly configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  try {
    // 1. Check if user exists in auth.users
    const { data: listRes, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      throw new Error(`Failed to list users: ${listErr.message}`);
    }

    const existingUser = listRes.users.find((u) => u.email?.toLowerCase() === email);
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

provisionAdmin();
