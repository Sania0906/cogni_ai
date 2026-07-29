import dotenv from "dotenv";
import { supabaseAdmin, supabase } from "./supabase";

dotenv.config();

async function runRegisterAndLoginTest() {
  const email = `test.user.${Date.now()}@example.com`;
  const password = "Password123456";
  const name = "Test User";

  console.log(
    `[Admin] Registering user: ${email} with password: ${password}...`,
  );

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

  console.log(`[Auth] Attempting login with: ${email} / ${password}...`);

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
}

runRegisterAndLoginTest().catch(console.error);
