<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);
        $this->call(NotificationTemplateSeeder::class);
        $this->call(SystemSettingsSeeder::class);
        $this->call(SupplierCapabilitiesSeeder::class);
        $this->call(CertificationsSeeder::class);

        if (app()->environment(['local', 'testing'])) {
            $this->call(DevSeeder::class);
        }
    }
}
