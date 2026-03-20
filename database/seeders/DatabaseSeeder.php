<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Database\Seeders\ContractArticlesSeeder;
use Database\Seeders\ContractTemplatesSeeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            EnterpriseProcurementSeeder::class,
            SupplierCategorySeeder::class,
            ContractArticlesSeeder::class,
            ContractTemplatesSeeder::class,
            NotificationConfigurationSeeder::class,
        ]);
    }
}
