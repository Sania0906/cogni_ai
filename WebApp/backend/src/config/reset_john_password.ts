import dotenv from "dotenv";
import { supabaseAdmin, supabase, findAuthUserByEmail } from "./supabase.js";
import { assertLegacyDevScriptAllowed, requireEnvCredential } from "./devScriptGuard.js";

dotenv.config();

async function resetDevTestUserPassword() {
  assertLegacyDevScriptAllowed("reset_john_password.ts");

  const email = requireEnvCredential("DEV_TEST_USER_EMAIL", "target dev test account email").toLowerCase();
  const password = requireEnvCredential("DEV_TEST_USER_PASSWORD", "replacement dev test password");

  // Find user by email across all Supabase Auth pages
  let targetUser;
  try {
    targetUser = await findAuthUserByEmail(email);
  } catch (listError: any) {
    console.error("Failed to list users:", listError?.message || listError);
    return;
  }

  if (!targetUser) {
    console.error(`Dev test user ${email} not found.`);
    return;
  }

  console.log(`Resetting password for dev test user ${targetUser.id} (${email})...`);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    {
      password,
    },
  );

  if (error) {
    console.error("❌ Failed to update password:", error.message);
    return;
  }

  console.log("✅ Password updated successfully! Now verifying login...");

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    console.error("❌ Login failed:", loginError.message);
  } else {
    console.log(
      "✅ Login successful! Session token:",
      !!loginData.session?.access_token,
    );
  }
}

resetDevTestUserPassword().catch(console.error);
