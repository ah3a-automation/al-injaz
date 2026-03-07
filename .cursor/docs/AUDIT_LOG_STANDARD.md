# ============================================================
# AUDIT_LOG_STANDARD.md — Activity Logging Rules (LOCKED)
# ============================================================

## 1. Purpose

Track critical state changes for governance, legal protection, traceability,
and audit readiness.

### Principles
- Backend is the source of truth.
- Logs must be consistent, structured, and safe (no secrets).
- Logs must reflect committed state only (no phantom logs).

---

## 2. Log Table

Table: `activity_logs` (BIGSERIAL PK)

### Minimum fields
- id
- subject_type (string)
- subject_id (VARCHAR(64)) ← must follow polymorphic ID rule
- event (string) ← standardized event key
- description (string)
- metadata (JSONB)
- created_by_user_id (BIGINT, nullable)
- created_at (TIMESTAMPTZ)

### Recommended additional fields (enterprise correlation)
- route_name (string, nullable)
- request_id (string, nullable) ← correlation id per request
- ip_address (string, nullable)
- user_agent (string, nullable)
- batch_id (UUID, nullable) ← bulk actions / export jobs correlation

### Recommended indexes
- idx_al_event → (event)
- idx_al_subject → (subject_type, subject_id)
- idx_al_created_at → (created_at)
- idx_al_actor_created → (created_by_user_id, created_at)

---

## 3. Must Log (Required Categories)

At minimum, log these:

### 3.1 CRUD + Lifecycle
- created
- updated
- deleted (soft or hard)
- restored (if applicable)
- status_changed
- assigned / unassigned

### 3.2 Bulk Actions
- bulk_updated
- bulk_deleted
- bulk_status_changed
- bulk_export_requested

### 3.3 Exports
- export_generated
- export_queued
- export_downloaded (optional)

### 3.4 Security / Governance
- permission_changed
- role_changed
- policy_denied (optional; rate limited)
- login_failed (optional; rate limited)

### 3.5 Financial / Commercial
- snapshot_created
- budget_reallocated
- value_changed (high-stakes amounts)

---

## 4. Event Naming Convention (STRICT)

Event key format:

`{module}.{entity}.{action}`

### Examples
- tasks.task.created
- tasks.task.status_changed
- projects.membership.added
- exports.tasks.export_generated
- rbac.role.permission_changed
- finance.snapshot.created

### Rules
- Use lower_snake_case tokens.
- Do not use free-text event names.
- Do not mix casing styles.

---

## 5. Metadata Format (Structured, Minimal, Safe)

Metadata must be JSON and should use these keys when applicable:

```json
{
  "old": { "status": "draft" },
  "new": { "status": "approved" },
  "context": "bulk_action",
  "filters": { "status": "open" },
  "selected_ids_count": 25,
  "export": { "format": "xlsx", "rows": 1200 }
}
```

### Rules
- Prefer storing diffs (old/new) over full model dumps.
- Keep metadata compact and query-friendly.
- Never store large arrays of IDs; store counts + batch_id.
- Never store entire request payloads.

---

## 6. Logging Rules (WHEN + WHERE + HOW) — MANDATORY

### 6.1 Timing Rule (Transaction Safety)

- Logs MUST be written only AFTER a successful DB transaction commit.
- Never log inside a transaction that may roll back.
- Never log before commit.

Accepted approaches:
- afterCommit hooks
- Domain events persisted after commit
- Queued logging job dispatched after commit (only if ordering is preserved)

---

### 6.2 Architectural Placement

Use a centralized service:

`app/Services/ActivityLogger.php`

Logging must be triggered from:
- Application layer (command/query handlers)
- Domain event listeners
- Observers/listeners that execute after commit

Never:
- Log directly inside controllers.
- Duplicate logging logic across modules.
- Write logs from frontend-only actions.

---

### 6.3 Required Context Enrichment

When available, include:
- request_id
- route_name
- ip_address
- user_agent
- batch_id (bulk/export)

---

## 7. Safety & Privacy Rules (MANDATORY)

Never log:
- Passwords
- OTP codes
- 2FA secrets
- Session cookies
- API keys / tokens / JWTs
- Password reset tokens
- Raw documents / file binaries / base64 blobs
- Private file URLs (prefer file_id)
- Sensitive personal information unless explicitly approved

If traceability requires sensitive reference:
- Store a redacted value (e.g., last 4 digits)
- Or store a reference id (file_id, user_id)
- Never store full secrets

Assume metadata may be audited externally.

---

## 8. Performance Rules (MANDATORY)

- Logging must not materially slow down user requests.
- For bulk actions, log ONE summary record.
  - Include selected_ids_count + batch_id
  - Do NOT log per-row unless required by compliance.
- Cap metadata size (recommended < 16KB).
- Avoid high-cardinality indexes on large free-text fields.

### Optional Scaling
If log volume becomes high:
- Use async logging AFTER COMMIT.
- Ensure reliable delivery.
- Ensure acceptable ordering for audit requirements.

---

## 9. Quality Gates (REQUIRED)

Before merging any feature that mutates state:

- Confirm backend policy checks exist.
- Confirm activity log event is emitted.
- Confirm event naming matches convention.
- Confirm metadata contains no secrets/PII.
- Confirm bulk/export logging is summary-based.

Never accept:
“We will add audit logging later.”