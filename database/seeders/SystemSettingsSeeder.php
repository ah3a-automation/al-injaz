<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $rows = [
            ['key' => 'mail_host', 'value' => '', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_port', 'value' => '587', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_username', 'value' => '', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_password', 'value' => '', 'setting_group' => 'mail', 'is_encrypted' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_encryption', 'value' => 'tls', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_from_name', 'value' => 'Al Injaz', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'mail_from_email', 'value' => '', 'setting_group' => 'mail', 'is_encrypted' => false, 'created_at' => $now, 'updated_at' => $now],
        ];

        DB::table('system_settings')->upsert(
            $rows,
            ['key'],
            ['value', 'is_encrypted', 'setting_group', 'updated_at']
        );
    }
}
