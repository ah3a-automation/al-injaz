<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('rfqs')) {
            return;
        }

        if (!Schema::hasColumn('rfqs', 'procurement_package_id')) {
            return;
        }

        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS uq_rfqs_procurement_package
            ON rfqs (procurement_package_id)
            WHERE procurement_package_id IS NOT NULL
            AND deleted_at IS NULL
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_rfqs_procurement_package;');
    }
};