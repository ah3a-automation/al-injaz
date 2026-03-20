<?php

declare(strict_types=1);

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class SupplierCategoryTemplateExport implements FromArray, WithHeadings, WithStyles
{
    public function __construct(
        private readonly int $level,
    ) {
        if ($level < 1 || $level > 3) {
            throw new \InvalidArgumentException('Level must be 1, 2, or 3.');
        }
    }

    public function array(): array
    {
        $rows = [];
        if ($this->level === 1) {
            $rows[] = ['MAT', 'Material Suppliers', 'موردو المواد', 'material_supplier', '1'];
        } elseif ($this->level === 2) {
            $rows[] = ['MAT-CON', 'Concrete', 'خرسانة', 'MAT', 'material_supplier', '1'];
        } else {
            $rows[] = ['MAT-CON-RMC', 'Ready Mix Concrete', 'خرسانة جاهزة', 'MAT-CON', 'material_supplier', '1'];
        }
        return $rows;
    }

    public function headings(): array
    {
        if ($this->level === 1) {
            return ['code', 'name_en', 'name_ar', 'supplier_type', 'is_active'];
        }
        return ['code', 'name_en', 'name_ar', 'parent_code', 'supplier_type', 'is_active'];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
