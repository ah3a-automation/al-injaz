<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupplierCapabilitiesSeeder extends Seeder
{
    public function run(): void
    {
        $categoryIds = DB::table('supplier_categories')->pluck('id', 'name_en')->all();

        $capabilitiesByCategory = [
            'Civil Works' => [
                'Concrete Works', 'Masonry', 'Earthworks', 'Road Construction', 'Waterproofing',
            ],
            'Structural Steel' => [
                'Steel Fabrication', 'Steel Erection', 'Welding', 'Coating & Painting',
            ],
            'Electrical' => [
                'HV Cabling', 'LV Distribution', 'Lighting Systems', 'Grounding & Lightning Protection',
            ],
            'Mechanical' => [
                'Piping', 'Equipment Installation', 'Pressure Testing', 'Insulation',
            ],
            'HVAC & Plumbing' => [
                'Ductwork', 'Chiller Systems', 'Plumbing Rough-in', 'Fire Suppression',
            ],
        ];

        $rows = [];
        $now = now();

        foreach ($capabilitiesByCategory as $categoryName => $capNames) {
            $categoryId = $categoryIds[$categoryName] ?? null;
            if ($categoryId === null) {
                continue;
            }
            $sortOrder = 1;
            foreach ($capNames as $name) {
                $slug = Str::slug($name);
                $rows[] = [
                    'category_id' => $categoryId,
                    'name' => $name,
                    'name_ar' => null,
                    'slug' => $slug,
                    'description' => null,
                    'is_active' => true,
                    'sort_order' => $sortOrder++,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (empty($rows)) {
            return;
        }

        DB::table('supplier_capabilities')->upsert(
            $rows,
            ['slug'],
            ['category_id', 'name', 'name_ar', 'description', 'is_active', 'sort_order', 'updated_at']
        );
    }
}
