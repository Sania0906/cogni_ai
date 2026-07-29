import dotenv from "dotenv";
import { supabaseAdmin, supabase } from "./supabase";

dotenv.config();

async function resetJohn() {
  const email = "john.test@example.com";
  const password = "Password123";

  // Find user by email
  const {
    data: { users },
    error: listError,
  } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    return;
  }

  const john = users.find((u) => u.email === email);
  if (!john) {
    console.error("User john.test@example.com not found!");
    return;
  }

  console.log(
    `Resetting password for user ${john.id} (${email}) to: ${password}...`,
  );

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    john.id,
    {
      password,
    },
  );

  if (error) {
    console.error("❌ Failed to update password:", error.message);
    return;
  }

  console.log("✅ Password updated successfully! Now testing login...");

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

resetJohn().catch(console.error);
