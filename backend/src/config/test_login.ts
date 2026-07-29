import dotenv from "dotenv";
import { supabase } from "./supabase";

dotenv.config();

async function testLogin() {
  const email = "john.test@example.com";
  const password = "Password123";

  console.log(`Attempting login with: ${email} / ${password}...`);

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
