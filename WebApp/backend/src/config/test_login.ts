import dotenv from "dotenv";
import { supabase } from "./supabase.js";
import { assertLegacyDevScriptAllowed, requireEnvCredential } from "./devScriptGuard.js";

dotenv.config();

async function testLogin() {
  assertLegacyDevScriptAllowed("test_login.ts");

  const email = requireEnvCredential("DEV_TEST_USER_EMAIL", "dev test login email").toLowerCase();
  const password = requireEnvCredential("DEV_TEST_USER_PASSWORD", "dev test login password");

  console.log(`Attempting dev login for: ${email}...`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(
      "❌ Login failed:",
      error.message,
      "(status:",
      error.status,
      ")",
    );
  } else {
    console.log("✅ Login successful!");
    console.log("User details:", data.user?.id, data.user?.email);
    console.log("Session token exists:", !!data.session?.access_token);
  }
}

testLogin().catch(console.error);
