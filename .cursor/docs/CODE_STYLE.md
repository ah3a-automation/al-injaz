# ============================================================
# CODE_STYLE.md — CCP Naming & Code Conventions (LOCKED)
# ============================================================

## 1) General
- Prefer clarity over brevity.
- No “magic” helpers or global functions.
- No anonymous arrays as DTOs in application code (use DTO classes).
- Always add strict types in PHP files.

## 2) Naming
- Classes: PascalCase (TaskPolicy, ListTasksQuery)
- Methods: camelCase (applyFilters, toSearchResult)
- Variables: camelCase ($createdByUserId)
- DB columns: snake_case
- Route names: kebab-case (tasks.index)

## 3) Folder responsibility
- Controllers: orchestration only (validate + call Application layer + return response)
- Application: command/query handlers and orchestration of domain operations
- Domain: business rules, state machines, invariants
- Infrastructure: persistence, external clients, integrations

## 4) Services / Queries / DTOs
- Services: VerbNounService (SearchService, ActivityLogger)
- Query Objects: ListXQuery / FindXQuery
- DTOs: XFilterDTO, ExportXDTO, CreateXDTO
- Enums: XStatus, XPriority

## 5) Events
- Past tense naming: TaskCreated, ContractApproved
- Payload must be structured arrays only (no models)

## 6) Errors
- Never swallow exceptions silently.
- Use toast for non-blocking UX; SweetAlert only for destructive confirmations.