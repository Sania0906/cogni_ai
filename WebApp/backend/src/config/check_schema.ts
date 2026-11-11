import dotenv from "dotenv";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase.js";

dotenv.config();

async function checkSchema() {
  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase is NOT configured. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.");
    process.exit(1);
  }

  console.log("Checking database connectivity and schema...");

  const tables = [
    "profiles",
    "skills",
    "courses",
    "certificates",
    "jobs",
    "recommendations",
    "notifications",
    "subscriptions",
    "assessments",
    "resumes",
    "ats_reports",
    "career_recommendations",
    "learning_roadmaps",
    "chat_history",
    "user_activity",
    "ai_insights",
    "market_insights",
    "certifications",
    "projects",
    "academic_details",
    "career_dna",
    "employability_scores",
    "user_courses",
  ];

  for (const table of tables) {
    // Try to select 1 row to see if table and columns exist
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      console.log(
        `❌ Table [${table}]: ERROR - ${error.message} (code: ${error.code})`,
      );
    } else {
      console.log(`✅ Table [${table}]: OK (Found ${data?.length} row(s))`);
      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(", ")}`);
      }
    }
  }
}

checkSchema().catch(console.error);
