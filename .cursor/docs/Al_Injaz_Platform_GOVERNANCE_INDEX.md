# ============================================================
# Al_Injaz_Platform_GOVERNANCE_INDEX.md
# Commercial Control Platform — Governance Anchor
# VERSION: V3.2 ENTERPRISE MAX
# ============================================================

## 0. Purpose

This file defines the governance hierarchy of Al Injaz Platform system.

It prevents:
- Architectural drift
- Rule contradictions
- AI tool freelancing
- Inconsistent implementations
- Schema deviation
- UI fragmentation

This file is the meta-index of all system rules.

If any rule conflict occurs, this file defines precedence.

---

# ============================================================
# 1. DOCUMENT HIERARCHY (NON-NEGOTIABLE)
# ============================================================

Order of authority (highest to lowest):

1. docs/charter_en_v3.0_final.html   ← DATABASE SOURCE OF TRUTH
2. .cursorrules                      ← CODE GENERATION LAW
3. ARCHITECTURE.md                   ← Layering & system structure
4. OUTBOX_PATTERN.md                 ← Event integration law
5. MEDIA_ARCHITECTURE.md             ← Media security & storage
6. SEARCH_ARCHITECTURE.md            ← Global search rules
7. AUDIT_LOG_STANDARD.md             ← Logging & compliance
8. FILTER_DTO_STANDARD.md            ← Filtering contract
9. Generated code

If conflict exists:
Higher-level document overrides lower-level document.

Code must never override written law.

---

# ============================================================
# 2. CORE SYSTEM GUARANTEES
# ============================================================

Al Injaz platform guarantees:

- Single-tenant architecture (no tenant_id anywhere)
- PostgreSQL-only persistence
- UUID default PKs (except notifications & activity_logs)
- Strict FK type consistency
- Deterministic constraint names
- Event-driven side effects
- After-commit logging
- Full RBAC enforcement
- No inline SQL in controllers
- No business logic in controllers
- One modal system
- One toast system
- One search system
- One DataTable standard
- One image pipeline
- No duplicated UI frameworks
- No duplicate integration logic

---

# ============================================================
# 3. CHANGE CONTROL RULES
# ============================================================

Before modifying:

- Database schema
- FK behavior
- Constraint names
- Index names
- Tasks table
- Polymorphic columns
- Image storage structure
- Audit log structure
- Event naming
- Search architecture
- DataTable contract

You MUST:

1. Update HTML charter first (if schema touched).
2. Update .cursorrules second.
3. Update relevant governance document.
4. Update verification checklist.
5. Confirm no drift across files.

Never:
- Modify migration without updating charter.
- Rename constraint without updating verification.
- Add column without checking polymorphic rules.
- Change FK without updating delete behavior table.

---

# ============================================================
# 4. AI TOOL GOVERNANCE
# ============================================================

When using:

- Cursor
- Claude
- ChatGPT
- Gemini
- Any other AI agent

Rules:

- Always provide .cursorrules first.
- Never allow AI to override schema law.
- Never accept generated migration without verifying:
  - FK types
  - Index names
  - Constraint names
  - Delete behavior
  - UUID vs BIGSERIAL correctness
- Never allow AI to:
  - Introduce tenant_id
  - Use SQLite fallback
  - Introduce Vue
  - Introduce Redux
  - Use direct Swal.fire()
  - Add inline SQL in controller

AI is an assistant, not an authority.

---

# ============================================================
# 5. COMPLIANCE & AUDIT GUARANTEE
# ============================================================

All state-changing operations must:

- Pass policy
- Emit domain event
- Persist event in outbox
- Log activity AFTER COMMIT
- Avoid sensitive metadata
- Follow event naming convention
- Respect RBAC during bulk operations

No feature may be merged without:
- Audit alignment
- Logging alignment
- Policy alignment

---

# ============================================================
# 6. FRONTEND CONSISTENCY GUARANTEE
# ============================================================

Frontend invariants:

- React 19 + TypeScript only
- Tailwind v4 only
- shadcn Dialog only
- One toast provider
- One global search
- One DataTable system
- No static HTML tables
- No per-module search duplication
- No per-module modal systems

Image invariants:

- Client crop/resize/compress
- Server EXIF strip + WebP convert
- Deterministic rename
- SHA256 hash
- Thumbnail generation
- No raw <img> for uploads

---

# ============================================================
# 7. ENTERPRISE SAFETY LEVEL
# ============================================================

Al Injaz Platform is designed for:

- Construction contract governance
- Financial traceability
- Supplier control
- Legal defensibility
- Audit readiness

This system must prioritize:
- Determinism
- Traceability
- Security
- Drift prevention
- Controlled evolution

Speed is secondary to integrity.

---

# ============================================================
# 8. VERSIONING RULE
# ============================================================

All governance changes must increment version:

V3.2 → V3.3 → V4.0 etc.

Major version = schema or architecture shift  
Minor version = rule hardening  
Patch version = clarification only  

---

# ============================================================
# END OF GOVERNANCE INDEX
# ============================================================

This file anchors the Al Injaz Platform.

Nothing may contradict it.