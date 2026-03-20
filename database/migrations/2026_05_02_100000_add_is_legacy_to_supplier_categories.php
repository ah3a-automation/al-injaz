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
        Schema::table('supplier_categories', function (Blueprint $table) {
            $table->boolean('is_legacy')->default(false)->after('is_active');
        });
        DB::statement("UPDATE supplier_categories SET is_legacy = true WHERE code LIKE 'LEGACY-%'");
        DB::statement('CREATE INDEX idx_supplier_categories_is_legacy ON supplier_categories (is_legacy)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_supplier_categories_is_legacy');
        Schema::table('supplier_categories', function (Blueprint $table) {
            $table->dropColumn('is_legacy');
        });
    }
};
