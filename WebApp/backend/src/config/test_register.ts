import crypto from "crypto";
import dotenv from "dotenv";
import { supabaseAdmin, supabase } from "./supabase.js";
import { assertLegacyDevScriptAllowed } from "./devScriptGuard.js";

dotenv.config();

async function runRegisterAndLoginTest() {
  assertLegacyDevScriptAllowed("test_register.ts");

  const email = `test.user.${Date.now()}@example.com`;
  const password = `${crypto.randomBytes(16).toString("hex")}Aa1!`;
  const name = "Test User";

  console.log(`[Dev Test] Registering ephemeral user: ${email}...`);

  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "user",
      },
    });

  if (createError) {
    console.error("❌ Admin registration failed:", createError.message);
    return;
  }

  console.log(
    "✅ Admin registration successful! User ID:",
    createData.user?.id,
  );
  console.log(
    "User email confirmed status:",
    createData.user?.email_confirmed_at,
  );

  console.log(`[Auth] Attempting login with ephemeral test user: ${email}...`);

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    console.error(
      "❌ Login failed:",
      loginError.message,
      "(status:",
      loginError.status,
      ")",
    );
  } else {
    console.log(
      "✅ Login successful! Session token:",
      !!loginData.session?.access_token,
    );
  }

  if (createData.user?.id) {
    await supabaseAdmin.from("profiles").delete().eq("id", createData.user.id);
    await supabaseAdmin.auth.admin.deleteUser(createData.user.id);
  }
}

runRegisterAndLoginTest().catch(console.error);
