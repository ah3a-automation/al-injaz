# ============================================================
# FOLDER_STRUCTURE.md — Strict Structure Rules
# ============================================================

## Backend

app/
  Domain/
  Application/
  Infrastructure/
  Policies/
  Services/
  Events/
  Listeners/

Never create:
- Helpers/
- Utils/
- Misc/
- Shared/

---

## Frontend

resources/js/
  Pages/
  Components/
    DataTable/
    Media/
    System/
  Layouts/
  Services/
  config/

Never create:
- utils/
- helpers/
- shared/
- temp/
- misc/

---

## Media Components

resources/js/Components/Media/
  ImageUploader.tsx
  ImageThumb.tsx
  ImageLightbox.tsx

---

## DataTable

resources/js/Components/DataTable/
  DataTable.tsx
  DataTableToolbar.tsx
  DataTablePagination.tsx
  DataTableFilters.tsx

---

## System Components

resources/js/Components/System/
  CommandPalette.tsx
  AppToaster.tsx