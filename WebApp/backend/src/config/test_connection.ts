import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function runConnectionDiagnostics() {
  console.log("=== SUPABASE CONNECTIVITY DIAGNOSTICS ===");
  
  const configured = isSupabaseConfigured();
  console.log(`[Check 1] isSupabaseConfigured(): ${configured}`);

  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) {
    console.log("❌ SUPABASE_URL is missing in environment variables.");
    return;
  }

  let host = "";
  try {
    const parsed = new URL(rawUrl);
    host = parsed.host;
    console.log(`[Check 2] URL Scheme: ${parsed.protocol}//${parsed.host}`);
  } catch (err: any) {
    console.log(`❌ Invalid URL format: ${err.message}`);
    return;
  }

  // Key format check
  const hasAnon = !!process.env.SUPABASE_ANON_KEY;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(`[Check 3] Keys present in ENV -> ANON_KEY: ${hasAnon}, SERVICE_ROLE_KEY: ${hasServiceRole}`);

  // Test Database Query
  console.log("[Check 4] Testing Database Query (profiles table)...");
  try {
    const { data, error, status, statusText } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ Database Query Error: ${error.message} (code: ${error.code || "N/A"}, status: ${status} ${statusText || ""})`);
    } else {
      console.log(`✅ Database Query Succeeded! HTTP Status: ${status}`);
    }
  } catch (err: any) {
    console.log(`❌ Database Fetch Exception: ${err.name} - ${err.message}`);
    if (err.cause) {
      console.log(`   Cause: ${err.cause.code || err.cause.message || JSON.stringify(err.cause)}`);
    }
  }

  // Test Auth Service
  console.log("[Check 5] Testing Supabase Auth Service...");
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      console.log(`❌ Auth Service Error: ${error.message} (status: ${error.status})`);
    } else {
      console.log(`✅ Auth Service Succeeded! Users queryable.`);
    }
  } catch (err: any) {
    console.log(`❌ Auth Service Exception: ${err.name} - ${err.message}`);
    if (err.cause) {
      console.log(`   Cause: ${err.cause.code || err.cause.message || JSON.stringify(err.cause)}`);
    }
  }

  console.log("=== DIAGNOSTICS COMPLETE ===");
}

runConnectionDiagnostics().catch(console.error);

