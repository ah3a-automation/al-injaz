
---

# 📄 2️⃣ `RUN_ORDER.md`

```md
# ============================================================
# RUN_ORDER.md — CCP Build Sequence
# ============================================================

## PHASE 1 — Core Infrastructure
1. Users
2. Roles & Permissions (Spatie)
3. Projects
4. Tasks
5. Task Assignees
6. Task Dependencies
7. Task Reminders

Verification:
- Run V1–V7 queries
- Confirm FK delete behaviors

---

## PHASE 2 — Communication
8. Comment Threads
9. Comment Messages
10. Comment Participants

Verification:
- chk_td_no_self exists
- Polymorphic IDs = VARCHAR(64)

---

## PHASE 3 — Notifications
11. Notifications
12. Notification Preferences

Verification:
- notifications.id BIGSERIAL
- uq_np_user_type_channel exists

---

## PHASE 4 — Financial
13. Financial Snapshots
14. Budget Reallocations

---

## PHASE 5 — Media
15. platform_files
16. file_attachments

Verify:
- EXIF stripping works
- Thumbnail generation works

---

## PHASE 6 — UI Components
17. DataTable component
18. Global Search
19. SweetAlert wrapper
20. Toast system
21. Media components

---

## ACCEPTANCE CHECK (Before Schema Commit)

Must pass:
- tasks.id UUID
- No assigned_to_user_id
- Required named indexes exist
- Unique constraints named correctly
- chk_td_no_self exists
- Zero tenant_id columns
- notifications.id BIGSERIAL