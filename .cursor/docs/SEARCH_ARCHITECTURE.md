# ============================================================
# SEARCH_ARCHITECTURE.md — Global Search Engine (V3.2 HARDENED)
# ============================================================

## 1. Objective

Provide a system-wide Command Palette that:

- Works from any page
- Is mounted once at layout level
- Uses PostgreSQL Full-Text Search
- Respects RBAC
- Respects soft deletes
- Automatically includes new modules

---

## 2. Keyboard Shortcuts

Default:
- macOS → Cmd+K
- Windows → Ctrl+K

Optional (user-configurable only):
- Ctrl+Alt+K

Must be configurable via user preferences.

---

## 3. Search Contract

All searchable entities MUST implement:

```php
interface SearchableEntity {
    public function toSearchResult(): array;
    public static function searchLabel(): string;
    public static function searchRoute(): string;
}
```

Rules:
- No free-text route construction in frontend.
- Backend generates route().

---

## 4. PostgreSQL FTS

Each searchable table must:

- Maintain tsvector column
- Have GIN index on tsvector

Never:
- LIKE '%term%' on large tables
- Client-side search filtering

---

## 5. Search Service

app/Services/SearchService.php

Responsibilities:
- Accept query
- Apply RBAC filtering
- Exclude soft-deleted records
- Query each registered SearchableEntity
- Limit per entity (5–10)
- Merge results
- Return normalized array

Never:
- Duplicate search logic per module
- Implement search inside controllers

---

## 6. Result Format

[
  'type' => 'Task',
  'title' => 'Fix BOQ pricing',
  'subtitle' => 'Project Alpha',
  'route' => route('tasks.show', $task->id),
]

---

## 7. Performance Rules

- Debounce ≥300ms
- Limit total results
- No unbounded queries
- Respect pagination internally