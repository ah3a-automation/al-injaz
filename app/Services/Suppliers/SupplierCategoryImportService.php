<?php

declare(strict_types=1);

namespace App\Services\Suppliers;

use App\Models\SupplierCategory;
use Illuminate\Support\Str;

final class SupplierCategoryImportService
{
    /**
     * @param  array<int, array<string, mixed>>  $rows  Rows with keys: code, name_en, name_ar, parent_code?, supplier_type, is_active
     * @return array{created: int, updated: int, skipped: int, errors: list<array{row: int, code: string|null, message: string}>
     */
    public function import(int $level, array $rows): array
    {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $rowIndex => $row) {
            $excelRow = $rowIndex + 2;
            $code = isset($row['code']) ? trim((string) $row['code']) : null;
            $nameEn = isset($row['name_en']) ? trim((string) $row['name_en']) : null;
            $nameAr = isset($row['name_ar']) ? trim((string) $row['name_ar']) : null;
            $parentCode = isset($row['parent_code']) ? trim((string) $row['parent_code']) : null;
            $supplierType = isset($row['supplier_type']) ? trim((string) $row['supplier_type']) : null;
            $isActive = $this->parseBool($row['is_active'] ?? true);

            if ($code === '' || $code === null) {
                $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_code_required')];
                $skipped++;
                continue;
            }
            if ($nameEn === '' || $nameEn === null) {
                $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_name_en_required')];
                $skipped++;
                continue;
            }
            if ($nameAr === '' || $nameAr === null) {
                $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_name_ar_required')];
                $skipped++;
                continue;
            }
            if (! in_array($supplierType, SupplierCategory::SUPPLIER_TYPES, true)) {
                $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_invalid_supplier_type')];
                $skipped++;
                continue;
            }

            if ($level === 1) {
                if ($parentCode !== '' && $parentCode !== null) {
                    $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_level1_no_parent')];
                    $skipped++;
                    continue;
                }
                $parentId = null;
            } else {
                if ($parentCode === '' || $parentCode === null) {
                    $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_parent_code_required')];
                    $skipped++;
                    continue;
                }
                $parent = SupplierCategory::where('code', $parentCode)->first();
                if (! $parent) {
                    $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_parent_not_found', ['code' => $parentCode])];
                    $skipped++;
                    continue;
                }
                if ($parent->level !== $level - 1) {
                    $errors[] = ['row' => $excelRow, 'code' => $code, 'message' => __('supplier_categories.import_parent_wrong_level', ['expected' => $level - 1, 'actual' => $parent->level])];
                    $skipped++;
                    continue;
                }
                $parentId = $parent->id;
            }

            $existing = SupplierCategory::where('code', $code)->first();
            if ($existing) {
                $existing->update([
                    'parent_id' => $parentId,
                    'name_en' => $nameEn,
                    'name_ar' => $nameAr,
                    'level' => $level,
                    'supplier_type' => $supplierType,
                    'is_active' => $isActive,
                ]);
                $updated++;
            } else {
                SupplierCategory::create([
                    'id' => (string) Str::uuid(),
                    'parent_id' => $parentId,
                    'code' => $code,
                    'name_en' => $nameEn,
                    'name_ar' => $nameAr,
                    'level' => $level,
                    'supplier_type' => $supplierType,
                    'is_active' => $isActive,
                ]);
                $created++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    private function parseBool(mixed $value): bool
    {
        if ($value === true || $value === 1 || $value === '1' || $value === 'yes' || $value === 'true') {
            return true;
        }
        if ($value === false || $value === 0 || $value === '0' || $value === 'no' || $value === 'false') {
            return false;
        }
        return true;
    }
}
