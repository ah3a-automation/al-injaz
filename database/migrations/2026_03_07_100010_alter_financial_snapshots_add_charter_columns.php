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
        Schema::table('financial_snapshots', function (Blueprint $table) {
            $table->string('trigger_type', 50)->default('manual')->after('project_id');
            $table->string('trigger_id', 64)->nullable()->after('trigger_type');
            $table->decimal('committed_cost_total', 18, 2)->default(0.00)->after('trigger_id');
            $table->decimal('forecast_margin_pct', 8, 4)->nullable()->after('committed_cost_total');
            $table->string('scope_type', 30)->default('project')->after('forecast_margin_pct');
            $table->string('scope_id', 64)->nullable()->after('scope_type');
        });

        DB::statement("ALTER TABLE financial_snapshots ADD CONSTRAINT chk_fs_trigger_type CHECK (trigger_type IN ('award','vo','boq_revision','contract_signed','manual'))");
        DB::statement("ALTER TABLE financial_snapshots ADD CONSTRAINT chk_fs_scope_type CHECK (scope_type IN ('project','package','system'))");
        DB::statement('CREATE INDEX idx_fs_trigger_type ON financial_snapshots (trigger_type)');
        DB::statement('CREATE INDEX idx_fs_scope ON financial_snapshots (scope_type, scope_id) WHERE scope_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_fs_trigger_type');
        DB::statement('DROP INDEX IF EXISTS idx_fs_scope');

        Schema::table('financial_snapshots', function (Blueprint $table) {
            $table->dropColumn([
                'trigger_type',
                'trigger_id',
                'committed_cost_total',
                'forecast_margin_pct',
                'scope_type',
                'scope_id',
            ]);
        });
    }
};
