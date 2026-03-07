#!/usr/bin/env bash
# Al-Injaz V3.2 — Governance Verification Script (PostgreSQL)
# Requires: psql + DATABASE_URL
# Usage: DATABASE_URL=... bash scripts/verify_governance.sh

set -euo pipefail

PASS=0
FAIL=0

run_check() {
  local label="$1"
  local query="$2"
  local expected="$3"

  local result
  result=$(psql "$DATABASE_URL" -t -c "$query" 2>/dev/null | tr -d ' \n\t\r')

  if [[ "$result" == "$expected" ]]; then
    echo "✅ $label"
    PASS=$((PASS+1))
  else
    echo "❌ $label — expected '$expected', got '$result'"
    FAIL=$((FAIL+1))
  fi
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set."
  echo "   Example: DATABASE_URL=postgres://user:pass@localhost:5432/db bash scripts/verify_governance.sh"
  exit 1
fi

echo "=== Al-Injaz Governance Verification ==="

# V1: tasks.id is uuid
run_check "V1: tasks.id is UUID" \
  "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='id'" \
  "uuid"

# V2: No assigned_to_user_id on tasks
run_check "V2: No assigned_to_user_id on tasks" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='assigned_to_user_id'" \
  "0"

# V3: notifications.id is bigint (BIGSERIAL underlying type)
run_check "V3: notifications.id is BIGINT" \
  "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='id'" \
  "bigint"

# V4: Zero tenant_id columns
run_check "V4: Zero tenant_id columns" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id'" \
  "0"

# V5: uq_np_user_type_channel exists
run_check "V5: uq_np_user_type_channel exists" \
  "SELECT COUNT(*) FROM pg_constraint WHERE conname='uq_np_user_type_channel'" \
  "1"

# V6: chk_td_no_self exists
run_check "V6: chk_td_no_self exists" \
  "SELECT COUNT(*) FROM pg_constraint WHERE conname='chk_td_no_self'" \
  "1"

# V7: Required named indexes exist (exact names)
run_check "V7: 6 required named indexes exist" \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_ct_poly','idx_tl_linkable','idx_notif_entity','idx_tr_task','idx_tr_remind_at','idx_np_user')" \
  "6"

echo ""
echo "Result: $PASS passed, $FAIL failed"
if [[ "$FAIL" -eq 0 ]]; then
  echo "✅ ALL CHECKS PASSED — safe to commit"
else
  echo "❌ FIX FAILURES BEFORE COMMITTING"
fi

exit "$FAIL"