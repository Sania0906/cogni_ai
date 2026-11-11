import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function testFullAuthLifecycle() {
  console.log("=== TESTING FULL AUTH LIFECYCLE WITH REAL SUPABASE ===");

  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase is not configured.");
    process.exit(1);
  }

  const testEmail = `live.test.${Date.now()}@saveetha.test.com`;
  const testPassword = "ValidPassword123!";
  const testName = "Live Test Student";

  console.log(`[Step 1] Creating user: ${testEmail}...`);

  // 1. Create in Supabase Auth via admin (same as auth.ts signup)
  const adminRes = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      name: testName,
      role: "user",
    },
  });

  if (adminRes.error || !adminRes.data?.user) {
    console.error("❌ Admin createUser failed:", adminRes.error?.message);
    process.exit(1);
  }

  const userId = adminRes.data.user.id;
  console.log(`✅ User created in auth.users! ID: ${userId}`);

  // 2. Insert profile into profiles table (same as auth.ts signup)
  console.log("[Step 2] Persisting user profile to public.profiles table...");
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      name: testName,
      email: testEmail,
      role: "user",
    });

  if (profileError) {
    console.error("❌ Profile upsert failed:", profileError.message);
    process.exit(1);
  }
  console.log("✅ Profile successfully persisted to profiles table!");

  // 3. Verify user can log in via signInWithPassword (same as auth.ts login)
  console.log("[Step 3] Logging in with email and password...");
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    console.error("❌ Login failed:", loginError.message);
    process.exit(1);
  }

  console.log(`✅ Login succeeded! Session Access Token exists: ${!!loginData.session?.access_token}`);

  // 4. Verify profile fetch by ID
  console.log("[Step 4] Fetching profile from database with session user ID...");
  const { data: fetchedProfile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (fetchErr || !fetchedProfile) {
    console.error("❌ Failed to fetch persisted profile:", fetchErr?.message);
    process.exit(1);
  }

  console.log(`✅ Profile retrieved from database: name="${fetchedProfile.name}", email="${fetchedProfile.email}", role="${fetchedProfile.role}"`);

  // 5. Clean up test user
  console.log("[Step 5] Cleaning up test user...");
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log("✅ Test user cleaned up successfully!");

  console.log("=== AUTH LIFECYCLE TEST COMPLETED WITH 100% SUCCESS ===");
}

testFullAuthLifecycle().catch(console.error);

