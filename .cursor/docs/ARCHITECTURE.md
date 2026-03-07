# ============================================================
# ARCHITECTURE.md — CCP System Architecture (V3.2 HARDENED)
# ============================================================

## 1. Architectural Principles (NON-NEGOTIABLE)

- Backend is the source of truth.
- PostgreSQL only (no MySQL, no SQLite in staging/production).
- Event-driven architecture (Transactional Outbox).
- Single-tenant system (no tenant_id anywhere).
- Policies gate ALL access.
- No business logic in controllers.
- No inline SQL in controllers.
- Complex queries must use Query Object pattern.
- Side effects must be event-driven.

Controllers = orchestration only.

---

## 2. Backend Layering (STRICT BOUNDARIES)

app/
  Domain/         → Entities, Value Objects, Domain Rules
  Application/    → Commands, Queries, Use Cases
  Infrastructure/ → DB, integrations, external services
  Policies/       → Authorization layer
  Services/       → Coordinators (non-domain orchestration only)

Layer Rules:
- Controllers call Application.
- Application calls Domain.
- Infrastructure handles persistence + integrations.
- Domain never depends on Infrastructure.
- No cross-layer shortcuts.

Violation of layer boundaries is forbidden.

---

## 3. Transactional Outbox Pattern

All external side effects must be event-driven.

Flow:
1. State change occurs.
2. Domain event recorded.
3. Event persisted in outbox_events table.
4. Horizon worker processes event.
5. Integration executed.

Never:
- Call external APIs directly in controllers.
- Send emails synchronously inside transactions.
- Perform async integrations inline.

Outbox must guarantee:
- After-commit safety.
- Idempotency support.
- Retry safety.

---

## 4. Search Architecture

All searchable entities MUST implement:

```php
interface SearchableEntity {
    public function toSearchResult(): array;
    public static function searchLabel(): string;
    public static function searchRoute(): string;
}
```

Rules:
- PostgreSQL Full-Text Search only.
- tsvector + GIN index mandatory.
- Respect RBAC.
- Respect soft deletes.
- No LIKE '%term%' on large tables.
- Search modal mounted once at layout.

New modules MUST auto-register via entity registry.

---

## 5. Enterprise DataTable Architecture

All list pages use:

resources/js/Components/DataTable/DataTable.tsx

Responsibilities:
- Server-side pagination
- Global search
- Column-level search
- Column filters
- Sort
- Column visibility (persist per user)
- Row selection
- Bulk actions
- Excel export
- PDF export

Server Responsibilities:
- Re-validate selected_ids against policy
- Reject unauthorized IDs
- Log bulk actions
- Log exports

Never:
- Client-side filtering large datasets
- Static HTML tables
- Duplicate table logic

---

## 6. Media Architecture (Aligned with V3.2)

Client:
- Crop
- Resize (max 2000px)
- Compress (0.80–0.85)
- Deterministic rename

Server:
- Validate MIME via finfo
- Normalize EXIF orientation BEFORE stripping
- Strip EXIF
- Convert to WebP
- Generate 300x300 square thumbnail
- Compute SHA256 for dedupe
- Store normalized + thumb
- Write platform_files
- Attach via file_attachments

Never:
- Store raw user filenames
- Accept SVG
- Skip EXIF stripping
- Show full-size image in list view

---

## 7. UI Governance

- One modal system (shadcn Dialog).
- One toast system.
- SweetAlert2 only via confirm.ts wrapper.
- RTL controlled at layout level only.
- No duplicate search modals.
- No competing UI systems.

---

## 8. AI Readiness

Optional:

public function toAIContext(): array;

Rules:
- Must pass policy first.
- No raw Eloquent dumps.
- No cost breakdown leakage.
- No margin % exposure.
- No internal financial formulas.
- Structured output only.

---

## 9. Compliance & Audit Alignment

All state-changing operations must:
- Pass policy
- Emit domain event
- Write activity log AFTER COMMIT
- Follow event naming convention
- Avoid sensitive metadata

No feature merges without audit alignment.