<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\SupplierCategory;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class SupplierCategoriesExport implements FromCollection, WithHeadings, WithColumnWidths, WithStyles, WithEvents
{
    public function collection(): Collection
    {
        $categories = SupplierCategory::orderBy('code')->get();
        $byId = $categories->keyBy('id');
        $idToCode = $categories->pluck('code', 'id')->all();
        $fullPathEn = [];
        $fullPathAr = [];
        foreach ($categories as $c) {
            $pathEn = [];
            $pathAr = [];
            $cur = $c;
            while ($cur !== null) {
                array_unshift($pathEn, $cur->name_en);
                array_unshift($pathAr, $cur->name_ar);
                $cur = $cur->parent_id ? ($byId->get($cur->parent_id) ?? null) : null;
            }
            $fullPathEn[$c->id] = implode(' > ', $pathEn);
            $fullPathAr[$c->id] = implode(' > ', $pathAr);
        }
        return $categories->map(fn (SupplierCategory $c) => [
            $c->id,
            $c->code,
            $c->name_en,
            $c->name_ar,
            $c->parent_id ?? '',
            $c->parent_id ? ($idToCode[$c->parent_id] ?? '') : '',
            (string) $c->level,
            $c->supplier_type,
            $c->is_active ? '1' : '0',
            ($c->is_legacy ?? false) ? '1' : '0',
            $fullPathEn[$c->id] ?? '',
            $fullPathAr[$c->id] ?? '',
        ]);
    }

    public function headings(): array
    {
        return [
            'id',
            'code',
            'name_en',
            'name_ar',
            'parent_id',
            'parent_code',
            'level',
            'supplier_type',
            'is_active',
            'is_legacy',
            'full_path_en',
            'full_path_ar',
        ];
    }

    /**
     * @return array<string, int>
     */
    public function columnWidths(): array
    {
        return [
            'A' => 38,
            'B' => 18,
            'C' => 35,
            'D' => 35,
            'E' => 38,
            'F' => 18,
            'G' => 8,
            'H' => 22,
            'I' => 10,
            'J' => 10,
            'K' => 50,
            'L' => 50,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    /**
     * @return array<class-string, callable>
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $event->sheet->getDelegate()->freezePane('A2');
            },
        ];
    }
}
