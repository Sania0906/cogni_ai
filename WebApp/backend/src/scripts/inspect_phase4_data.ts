import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function inspect() {
  console.log("Supabase configured:", isSupabaseConfigured());
  for (const table of ["courses", "jobs", "user_courses", "user_activity", "certificates"]) {
    const { data, count, error } = await supabaseAdmin.from(table).select("*", { count: "exact" }).limit(5);
    console.log(`Table [${table}]: count=${count}, err=${error?.message}`);
    if (data && data.length > 0) {
      console.log(`  Sample row:`, Object.keys(data[0]));
      console.log(`  Row 0:`, JSON.stringify(data[0]));
    }
  }
}

inspect().catch(console.error);

