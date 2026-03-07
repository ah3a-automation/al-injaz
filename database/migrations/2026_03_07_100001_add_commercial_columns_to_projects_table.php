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
        Schema::table('projects', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('id');
            $table->string('name_ar', 200)->nullable()->after('name');
            $table->string('name_en', 200)->nullable()->after('name_ar');
            $table->decimal('planned_margin_pct', 5, 2)->default(20.00)->after('status');
            $table->decimal('min_margin_pct', 5, 2)->default(10.00)->after('planned_margin_pct');
            $table->string('currency', 3)->default('SAR')->after('min_margin_pct');
            $table->string('erp_reference_id', 100)->nullable()->after('currency');
        });

        DB::statement("
            UPDATE projects
            SET name_en = name
            WHERE name_en IS NULL AND name IS NOT NULL
        ");

        DB::statement("
            CREATE UNIQUE INDEX idx_projects_code_unique
            ON projects (code)
            WHERE code IS NOT NULL
        ");

        DB::statement("CREATE INDEX idx_projects_currency ON projects (currency)");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_projects_code_unique");
        DB::statement("DROP INDEX IF EXISTS idx_projects_currency");

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'code', 'name_ar', 'name_en',
                'planned_margin_pct', 'min_margin_pct',
                'currency', 'erp_reference_id',
            ]);
        });
    }
};
