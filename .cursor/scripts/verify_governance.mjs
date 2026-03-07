#!/usr/bin/env node
/**
 * Al-Injaz V3.2 — Governance Verification Script (PostgreSQL)
 * Requires: psql available in PATH + DATABASE_URL env var
 * Usage: DATABASE_URL=... node scripts/verify_governance.mjs
 */
import { execFileSync } from "node:child_process";

function psql(query) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const out = execFileSync("psql", [url, "-t", "-c", query], { encoding: "utf8" });
  return out.replace(/\s+/g, "");
}

let pass = 0;
let fail = 0;

function runCheck(label, query, expected) {
  let result = "";
  try {
    result = psql(query);
  } catch (e) {
    console.error(`❌ ${label} — psql failed: ${e.message}`);
    fail++;
    return;
  }
  if (result === expected) {
    console.log(`✅ ${label}`);
    pass++;
  } else {
    console.log(`❌ ${label} — expected '${expected}', got '${result}'`);
    fail++;
  }
}

console.log("=== Al-Injaz V3.2 Governance Verification (Node) ===");

runCheck(
  "V1: tasks.id is UUID",
  "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='id'",
  "uuid"
);

runCheck(
  "V2: No assigned_to_user_id on tasks",
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='assigned_to_user_id'",
  "0"
);

runCheck(
  "V3: notifications.id is BIGINT",
  "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='id'",
  "bigint"
);

runCheck(
  "V4: Zero tenant_id columns",
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id'",
  "0"
);

runCheck(
  "V5: uq_np_user_type_channel exists",
  "SELECT COUNT(*) FROM pg_constraint WHERE conname='uq_np_user_type_channel'",
  "1"
);

runCheck(
  "V6: chk_td_no_self exists",
  "SELECT COUNT(*) FROM pg_constraint WHERE conname='chk_td_no_self'",
  "1"
);

runCheck(
  "V7: 6 required named indexes exist",
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_ct_poly','idx_tl_linkable','idx_notif_entity','idx_tr_task','idx_tr_remind_at','idx_np_user')",
  "6"
);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);