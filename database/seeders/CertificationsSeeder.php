<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CertificationsSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['name' => 'ISO 9001', 'issuing_body' => 'ISO', 'requires_expiry' => true, 'sort_order' => 1],
            ['name' => 'ISO 14001', 'issuing_body' => 'ISO', 'requires_expiry' => true, 'sort_order' => 2],
            ['name' => 'ISO 45001', 'issuing_body' => 'ISO', 'requires_expiry' => true, 'sort_order' => 3],
            ['name' => 'SASO Certification', 'issuing_body' => 'SASO', 'requires_expiry' => true, 'sort_order' => 4],
            ['name' => 'Aramco Approved', 'issuing_body' => 'Saudi Aramco', 'requires_expiry' => true, 'sort_order' => 5],
            ['name' => 'SEC Approved', 'issuing_body' => 'SEC', 'requires_expiry' => true, 'sort_order' => 6],
            ['name' => 'MOMRA Approved', 'issuing_body' => 'MOMRA', 'requires_expiry' => true, 'sort_order' => 7],
            ['name' => 'ZATCA Registered', 'issuing_body' => 'ZATCA', 'requires_expiry' => false, 'sort_order' => 8],
            ['name' => 'GOSI Compliant', 'issuing_body' => 'GOSI', 'requires_expiry' => false, 'sort_order' => 9],
            ['name' => 'Nitaqat Platinum', 'issuing_body' => 'HRSD', 'requires_expiry' => true, 'sort_order' => 10],
        ];

        $now = now();
        $data = [];
        foreach ($rows as $r) {
            $data[] = [
                'name' => $r['name'],
                'name_ar' => null,
                'slug' => Str::slug($r['name']),
                'issuing_body' => $r['issuing_body'],
                'description' => null,
                'requires_expiry' => $r['requires_expiry'],
                'is_active' => true,
                'sort_order' => $r['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('certifications')->upsert(
            $data,
            ['slug'],
            ['name', 'name_ar', 'issuing_body', 'description', 'requires_expiry', 'is_active', 'sort_order', 'updated_at']
        );
    }
}
