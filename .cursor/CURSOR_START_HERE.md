# CURSOR_START_HERE.md — AI Mandatory Entry Point (LOCKED)
# Al Injaz Platform · V3.2.1 HARDENED · March 2026

---

## ⚠️ READ THIS FIRST — BEFORE GENERATING OR EDITING ANY CODE

You are working on the **Al Injaz Platform** — a governed, enterprise-grade
Laravel 12 application. Every file you produce is subject to strict architectural law.

---

## STEP 1 — Load the Law (NON-NEGOTIABLE ORDER)

Read these files completely before doing anything:

| Priority | File | Purpose |
|----------|------|---------|
| 1 (Highest) | `/.cursorrules` | Code generation law — stack, schema, forbidden patterns |
| 2 | `/.cursor/docs/Al_Injaz_Platform_GOVERNANCE_INDEX.md` | Governance hierarchy & conflict resolution |
| 3 | `/.cursor/docs/ARCHITECTURE.md` | Layering, service structure, controller rules |
| 4 | `/.cursor/docs/OUTBOX_PATTERN.md` | All event-driven side effects |
| 5 | `/.cursor/docs/MEDIA_ARCHITECTURE.md` | Image pipeline — mandatory for any file upload |
| 6 | `/.cursor/docs/SEARCH_ARCHITECTURE.md` | Global search — Command Palette rules |
| 7 | `/.cursor/docs/AUDIT_LOG_STANDARD.md` | All state-changing operations |
| 8 | `/.cursor/docs/FILTER_DTO_STANDARD.md` | All index/list endpoints |

> **In any conflict: higher priority file wins. Code never overrides law.**

---

## STEP 2 — Identify Your Task Type & Load the Right Prompt

Use the pre-built prompts in `.cursor/prompts/` for these common tasks:

| Task | Prompt File |
|------|------------|
| Database migration | `/.cursor/prompts/db-migration.prompt.md` |
| DataTable / index page | `/.cursor/prompts/datatable-page.prompt.md` |
| Image / media upload | `/.cursor/prompts/media-upload.prompt.md` |
| Global search extension | `/.cursor/prompts/search.prompt.md` |

---

## STEP 3 — Load Any Domain-Specific Reference

| Area | File |
|------|------|
| Code style & naming | `/.cursor/docs/CODE_STYLE.md` |
| Folder structure rules | `/.cursor/docs/FOLDER_STRUCTURE.md` |
| Security & authorization | `/.cursor/docs/SECURITY_POLICY.md` |
| Export (Excel / PDF) | `/.cursor/docs/EXPORT_POLICY.md` |
| Deployment rules | `/.cursor/docs/DEPLOYMENT_GUIDELINES.md` |
| Migration run order | `/.cursor/docs/RUN_ORDER.md` |
| Governance change log | `/.cursor/docs/GOVERNANCE_CHANGE_LOG.md` |

---

## STEP 4 — Governance Checks Before Writing Any Code

Before generating schema, migrations, or models — verify:

- [ ] `tasks.id` is UUID (`gen_random_uuid()`)
- [ ] No `assigned_to_user_id` on tasks
- [ ] No `tenant_id` anywhere in the schema
- [ ] `notifications.id` is BIGSERIAL (not UUID)
- [ ] All polymorphic `*_id` columns are `VARCHAR(64)`
- [ ] All polymorphic `*_type` columns are `VARCHAR(191)`
- [ ] No `foreignUuid()` pointing to `users.id`
- [ ] All performance indexes use `DB::statement()`, NOT `$table->index()`
- [ ] Required named indexes exist (see §2.7 of `.cursorrules`)
- [ ] Required named constraints exist (see §2.9 of `.cursorrules`)

> Run `/.cursor/scripts/verify_governance.sh` (or `.mjs`) against the database before committing.

---

## STEP 5 — Mandatory Output Format

Every code generation response MUST include:

```
1. Files changed (full paths from project root)
2. Exact code (no placeholders, no ellipsis)
3. Verification checklist (V1–V7 from .cursorrules §7 + any extras)
4. Governance conflict notice (if any — STOP and explain before proceeding)
```

---

## HARD STOPS — Refuse These Without Exception

Stop and explain if the request would cause any of the following:

- Adding `tenant_id` to any table
- Using `foreignUuid()` to reference `users.id`
- Using `timestamp()` instead of `timestampTz()`
- Using `$table->index()` inside `Schema::create()`
- Adding `assigned_to_user_id` or `owner_user_id` to tasks
- Introducing Vue, Redux, direct `Swal.fire()`, or plain JS
- Skipping EXIF stripping on image upload
- Using `LIKE '%term%'` on large tables instead of PostgreSQL FTS
- Fetching full dataset to the client for filtering
- Adding a second modal system, toast system, or search system

---

## Project Stack Reference

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12 · PHP 8.3+ |
| Database | PostgreSQL (ONLY — no MySQL, no SQLite in prod) |
| Cache / Queue | Redis + Horizon |
| Architecture | Event-driven (Transactional Outbox) |
| RBAC | spatie/laravel-permission |
| Frontend | React 19 · TypeScript · Inertia.js |
| Styling | Tailwind CSS v4 · shadcn/ui · lucide-react |
| Alerts | SweetAlert2 (via `resources/js/Services/confirm.ts` ONLY) |
| i18n / RTL | Arabic + English · dir/lang at `<html>` level only |
