
---

# 📄 2️⃣ `DATATABLE_BACKEND_CONTRACT.md`

```md
# ============================================================
# DATATABLE_BACKEND_CONTRACT.md
# ============================================================

## 1. Objective

Standardize filtering, sorting, pagination, and export
for ALL list endpoints.

---

## 2. Controller Pattern

Controller MUST:

- Validate request
- Pass to Query Object
- Return paginated response

Never:
- Build filtering inline in controller

---

## 3. Query Object Pattern

Example:

app/Application/Tasks/Queries/ListTasksQuery.php

Responsibilities:
- Apply q search
- Apply filters[]
- Apply sorting
- Apply pagination
- Apply RBAC scoping

---

## 4. Standard Filter DTO

Allowed query keys:

q
filters[field]
sort[field]
sort[dir]
page
per_page
selected_ids[]

Never invent new keys.

---

## 5. Sorting Rules

- Default sort must be defined
- Only allow sortable columns whitelist
- Reject arbitrary sort[field]

---

## 6. Export Contract

Exports must:

- Reuse same Query Object
- Apply identical filters
- Log activity
- Validate RBAC

Never:
- Rebuild query logic for export
- Bypass pagination without validation

---

## 7. Bulk Actions Contract

Bulk endpoint must:

- Validate selected_ids[]
- Check policy for each record
- Wrap in transaction
- Log action