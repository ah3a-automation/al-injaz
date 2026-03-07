# CCP — Database Migration Prompt (V3.2 HARDENED)

## READ FIRST (MANDATORY)
- /.cursorrules
- /.cursor/docs/Al_Injaz_Platform_GOVERNANCE_INDEX.md
- /.cursor/docs/ARCHITECTURE.md
- /.cursor/docs/RUN_ORDER.md
- /.cursor/docs/charter_en_v3.0_final.html (database truth)

If there is any conflict between request and governance → STOP and explain.

---

## TASK

Generate Laravel migration(s) aligned strictly with:

- UUID default PK (gen_random_uuid())
- BIGSERIAL only for notifications & activity_logs
- FK type rule:
  - users.id → foreignId()
  - UUID tables → foreignUuid()
- Required named indexes
- Required named unique constraints
- Explicit FK ON DELETE behavior
- timestampTz() only (never timestamp())

---

## HARD RULES

- Performance indexes MUST use DB::statement() after Schema::create().
- Never use $table->index() inside Schema::create().
- Polymorphic *_id columns → VARCHAR(64).
- Polymorphic *_type columns → VARCHAR(191).
- No tenant_id anywhere.
- No due_date on tasks (use due_at TIMESTAMPTZ).
- No assigned_to_user_id on tasks.

---

## OUTPUT FORMAT

1. Files created/updated (full path)
2. Complete migration code (up + down)
3. Model adjustments (if required)
4. Verification checklist:

- tasks.id = UUID?
- No assigned_to_user_id?
- Required named indexes exist?
- Unique constraint names correct?
- chk_td_no_self exists?
- No tenant_id?
- notifications.id BIGSERIAL?
- Polymorphic columns correct type?

Do not return explanation unless a governance conflict exists.