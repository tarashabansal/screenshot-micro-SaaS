// scripts/cleanup.js

// ---- 1) Load env vars safely (works in ESM & CommonJS) ----
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Determine project root
const root = process.cwd();

// Load .env.local if present
const envLocal = path.join(root, ".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}

// Also load default .env if exists
const envDefault = path.join(root, ".env");
if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}

// ---- 2) Now import Supabase ----
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Values:", { SUPABASE_URL, SERVICE_ROLE });
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

// ---- 3) Cleanup Logic ----
async function cleanup() {
  console.log("Running cleanup... DRY_RUN=", DRY_RUN);

  const now = new Date().toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from("screenshots")
    .select("id, storage_path")
    .lt("expires_at", now);

  if (error) {
    console.error("DB fetch error:", error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No expired rows.");
    return;
  }

  console.log("Found expired rows:", rows.length);

  for (const row of rows) {
    console.log(`Processing ${row.id} (${row.storage_path})`);

    if (!DRY_RUN) {
      const { error: removeErr } = await supabaseAdmin.storage
        .from("screenshots")
        .remove([row.storage_path]);

      if (removeErr) console.error("Remove error:", removeErr);

      const { error: deleteErr } = await supabaseAdmin
        .from("screenshots")
        .delete()
        .eq("id", row.id);

      if (deleteErr) console.error("Delete row error:", deleteErr);
    } else {
      console.log("(dry-run) Would delete", row.storage_path);
    }
  }

  console.log("Cleanup done.");
}

cleanup();
