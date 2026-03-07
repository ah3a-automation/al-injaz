# CCP — Global Search Prompt (V3.2 HARDENED)

## READ FIRST (MANDATORY)
- /.cursorrules
- /.cursor/docs/SEARCH_ARCHITECTURE.md
- /.cursor/docs/ARCHITECTURE.md

If conflict exists → STOP.

---

## TASK

Implement or extend Global Search (Command Palette).

---

## REQUIREMENTS

- Mounted once at layout level.
- Debounce ≥ 300ms.
- Arrow navigation required.
- ESC closes.
- Respect RBAC.
- Exclude soft-deleted records.
- Use PostgreSQL Full-Text Search (tsvector + GIN).
- Never use LIKE '%term%' on large tables.

---

## SHORTCUTS

Default:
- macOS → Cmd+K
- Windows → Ctrl+K

Optional:
- Ctrl+Alt+K (user configurable only)

---

## BACKEND CONTRACT

All searchable entities MUST implement:

```php
interface SearchableEntity {
    public function toSearchResult(): array;
    public static function searchLabel(): string;
    public static function searchRoute(): string;
}
```

SearchService must:
- Merge results from registered entities.
- Limit results per entity (5–10).
- Return normalized array.

---

## OUTPUT FORMAT

1. Files changed
2. SearchService code
3. Entity registration logic
4. Example implementation for one module