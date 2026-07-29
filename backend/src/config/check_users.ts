import dotenv from "dotenv";
import { supabaseAdmin } from "./supabase";

dotenv.config();

async function checkUsers() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log(`Found ${profiles?.length || 0} user profiles:`);
    console.log(JSON.stringify(profiles, null, 2));
  }
}

checkUsers().catch(console.error);
