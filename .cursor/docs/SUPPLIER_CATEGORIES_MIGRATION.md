# Supplier Categories Tree Migration

## If you see: `SQLSTATE[42703]: Undefined column: column "code" does not exist`

**Root cause:** The application code expects the **new** tree-based `supplier_categories` schema (with `code`, `name_en`, `name_ar`, `supplier_type`, `parent_id`, etc.), but the database still has the **old** flat schema (with `id`, `name`, `name_ar`, `slug`, etc. from migration `2026_03_06_000001_create_suppliers_tables`).

## Migrations involved

1. **`2026_05_01_100000_supplier_categories_tree_replacement.php`**  
   Renames old tables to `*_legacy`, creates new `supplier_categories` (UUID, `code`, `name_en`, `name_ar`, `level`, `supplier_type`, `parent_id`, etc.) and new `supplier_category_assignments`, migrates data, then drops legacy tables.

2. **`2026_05_02_100000_add_is_legacy_to_supplier_categories.php`**  
   Adds `is_legacy` column and index.

## Fix (run in project root, same environment as your app/DB)

```bash
php artisan migrate
php artisan db:seed --class=SupplierCategorySeeder
```

- **`migrate`** runs any pending migrations, including the two above, and brings `supplier_categories` to the new tree schema.
- **`db:seed --class=SupplierCategorySeeder`** populates the tree (from workbook if present, otherwise the default tree). Run after migrate. The default tree includes **children** under MAT, EQP, and LAB so the public registration page shows a real hierarchy (expandable parents and selectable leaf sub-categories).

## Verify

- **Migration status:** `php artisan migrate:status` — both `2026_05_01_*` and `2026_05_02_*` should show as "Ran".
- **Schema:** After migrate, `supplier_categories` should have columns: `id` (uuid), `parent_id`, `code`, `name_en`, `name_ar`, `level`, `supplier_type`, `is_active`, `is_legacy`, `created_at`, `updated_at`.

## If you use Docker

Run the same commands inside the app container, e.g.:

```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed --class=SupplierCategorySeeder
```

(Replace `app` with your Laravel service name if different.)
