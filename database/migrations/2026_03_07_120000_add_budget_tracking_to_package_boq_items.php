<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('package_boq_items', function (Blueprint $table) {
            $table->decimal('consumed_cost', 14, 2)->default(0)->after('allocated_budget_cost');
        });

        DB::statement(
            'ALTER TABLE package_boq_items ADD COLUMN remaining_budget decimal(18,2) ' .
            'GENERATED ALWAYS AS (allocated_budget_cost - consumed_cost) STORED'
        );

        Schema::table('package_boq_items', function (Blueprint $table) {
            $table->decimal('consumed_qty', 15, 4)->nullable()->after('qty_allocated');
        });
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE package_boq_items DROP COLUMN IF EXISTS remaining_budget');
        Schema::table('package_boq_items', function (Blueprint $table) {
            $table->dropColumn(['consumed_qty', 'consumed_cost']);
        });
    }
};
