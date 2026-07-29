import dotenv from "dotenv";
import { supabaseAdmin } from "./supabase";

dotenv.config();

async function checkAuthUsers() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Error listing auth users:", error);
  } else {
    console.log(`Found ${users?.length || 0} authenticated users:`);
    for (const u of users || []) {
      console.log(`- ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Confirmed At: ${u.email_confirmed_at}`);
      console.log(`  User Metadata:`, u.user_metadata);
      console.log(`  Created At: ${u.created_at}`);
      console.log(`-----------------------------`);
    }
  }
}

checkAuthUsers().catch(console.error);
