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
        Schema::table('suppliers', function (Blueprint $table) {
            $table->decimal('max_contract_value', 15, 2)->nullable()->after('risk_score');
            $table->integer('workforce_size')->nullable()->after('max_contract_value');
            $table->text('equipment_list')->nullable()->after('workforce_size');
            $table->text('capacity_notes')->nullable()->after('equipment_list');
            $table->timestampTz('capacity_updated_at')->nullable()->after('capacity_notes');
        });
        DB::statement('CREATE INDEX idx_suppliers_max_contract ON suppliers (max_contract_value)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_max_contract');
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'max_contract_value',
                'workforce_size',
                'equipment_list',
                'capacity_notes',
                'capacity_updated_at',
            ]);
        });
    }
};
