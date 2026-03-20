<?php

declare(strict_types=1);

namespace App\Imports;

use App\Services\Suppliers\SupplierCategoryImportService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

final class SupplierCategoriesImport implements ToCollection, WithHeadingRow
{
    /** @var array{created: int, updated: int, skipped: int, errors: list<array{row: int, code: string|null, message: string}>}|null */
    public ?array $result = null;

    public function __construct(
        private readonly int $level,
        private readonly SupplierCategoryImportService $importService,
    ) {
    }

    public function collection(Collection $rows): void
    {
        $rowsArray = $rows->map(function ($row) {
            $arr = $row instanceof Collection ? $row->toArray() : (array) $row;
            $normalized = [];
            foreach ($arr as $k => $v) {
                $key = is_string($k) ? str_replace(' ', '_', strtolower(trim($k))) : $k;
                $normalized[$key] = $v;
            }
            return $normalized;
        })->all();
        $this->result = $this->importService->import($this->level, $rowsArray);
    }
}
