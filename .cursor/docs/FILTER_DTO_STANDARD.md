# ============================================================
# FILTER_DTO_STANDARD.md — Unified Filtering Contract
# ============================================================

## Allowed Query Parameters

q=string

filters[field]=value
filters[date_from]=YYYY-MM-DD
filters[date_to]=YYYY-MM-DD

sort[field]=column
sort[dir]=asc|desc

page=1
per_page=25

selected_ids[]=uuid

columns[hidden][]=field_name

---

## Rules

- No additional query keys allowed.
- sort[field] must be whitelisted.
- selected_ids[] must be validated server-side.
- Column visibility preferences saved per user per module.
- Exports must respect filters.

---

## Example

GET /tasks?
q=contract&
filters[status]=open&
sort[field]=due_at&
sort[dir]=asc&
page=2&
per_page=25&
columns[hidden][]=priority