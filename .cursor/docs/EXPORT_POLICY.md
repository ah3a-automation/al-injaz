# ============================================================
# EXPORT_POLICY.md — Enterprise Export Control
# ============================================================

## 1. Export Formats

Allowed:
- Excel (.xlsx)
- PDF (server-rendered only)

Never:
❌ Client-side CSV blob
❌ Export without RBAC check

---

## 2. Export Flow

1. Validate permission (e.g., tasks.export)
2. Reuse Query Object
3. Apply identical filters
4. Log export action
5. Generate file

---

## 3. Large Dataset Handling

If result count > threshold (configurable):

- Dispatch export job
- Notify user when ready
- Store file temporarily
- Provide signed URL
- Auto-expire file

Never:
❌ Stream unbounded dataset synchronously
❌ Bypass pagination safety

---

## 4. Export Metadata

Log:
- Applied filters
- User ID
- Timestamp
- Row count
- Module name