# ============================================================
# GOVERNANCE_CHANGE_LOG.md — CCP Governance Version Log
# ============================================================

## V3.2 — Enterprise Max Hardening

### Added
- Task-level Cursor enforcement prompts:
  - db-migration.prompt.md
  - datatable-page.prompt.md
  - search.prompt.md
  - media-upload.prompt.md
- Governance verification scripts:
  - scripts/verify_governance.sh
  - scripts/verify_governance.mjs
- Governance anchor + hierarchy enforcement:
  - Al_Injaz_Platform_GOVERNANCE_INDEX.md
- Operational contracts:
  - FILTER_DTO_STANDARD.md
  - DATATABLE_BACKEND_CONTRACT.md
  - EXPORT_POLICY.md
- Security hardening baseline:
  - SECURITY_POLICY.md

### Changed
- Standardized Cursor workflow:
  - Session-level enforcement via CURSOR_START_HERE.md
  - Task-level enforcement via prompt templates
- Media pipeline hardened:
  - Server-side EXIF stripping mandatory
  - WebP normalization
  - Thumbnail generation requirement
  - SHA256 hashing for deduplication (governance requirement)

### Fixed
- Restored and enforced named index strategy (exact names).
- Restored and enforced unique constraint name strategy (exact names).
- Restored and enforced FK delete behaviors.

### Notes
- Canonical truth remains the HTML charter.
- .cursorrules may only harden behavior where it does not contradict charter.
- Any schema-level hardening that changes types/columns requires charter update first.

---

## V3.1 — Governance Expansion

- Added Global Search (command palette) architecture
- Added Enterprise DataTable standard
- Added SweetAlert2 governance wrapper rule
- Added modal/toast standardization rules
- Added performance guardrails