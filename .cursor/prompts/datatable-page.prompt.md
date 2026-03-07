# CCP — Enterprise DataTable Page Prompt (V3.2 HARDENED)

## READ FIRST (MANDATORY)
- /.cursorrules
- /.cursor/docs/ARCHITECTURE.md
- /.cursor/docs/DATATABLE_BACKEND_CONTRACT.md
- /.cursor/docs/FILTER_DTO_STANDARD.md
- /.cursor/docs/AUDIT_LOG_STANDARD.md

If conflict exists → STOP.

---

## TASK

Build or update an index/list page using:

resources/js/Components/DataTable/DataTable.tsx

---

## MANDATORY FEATURES (NO EXCEPTIONS)

- Server-side pagination
- Global search
- Column-level search
- Column filters
- Sorting
- Show/Hide columns (persist per user per module)
- Row selection checkboxes
- Bulk actions
- Excel export (server-side)
- PDF export (server-side)
- Loading state
- Empty state
- Error state

---

## SERVER RULES

- Re-validate every selected_id against policy.
- Reject unauthorized IDs.
- Log bulk actions in activity_logs.
- Log exports in activity_logs.
- Never fetch full dataset to client for filtering.

---

## UI RULES

- No static HTML tables.
- No client-side filtering of full dataset.
- Destructive bulk actions MUST use confirm.ts (SweetAlert2 wrapper).
- No direct Swal.fire().

---

## OUTPUT FORMAT

1. Files changed (full paths)
2. Page component code
3. Controller / Query Object code
4. Export endpoints (if added)
5. Activity logging integration
6. Explanation of RBAC revalidation