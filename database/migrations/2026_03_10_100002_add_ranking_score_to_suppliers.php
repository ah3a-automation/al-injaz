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
            $table->decimal('ranking_score', 5, 2)->nullable()->after('risk_score');
            $table->string('ranking_tier', 30)->nullable()->after('ranking_score');
            $table->timestampTz('ranking_scored_at')->nullable()->after('ranking_tier');
        });
        DB::statement("ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_ranking_tier CHECK (ranking_tier IS NULL OR ranking_tier IN ('preferred','approved','watchlist','restricted'))");
        DB::statement('CREATE INDEX idx_suppliers_ranking_score ON suppliers (ranking_score) WHERE ranking_score IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_ranking_tier');
        DB::statement('DROP INDEX IF EXISTS idx_suppliers_ranking_score');
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['ranking_score', 'ranking_tier', 'ranking_scored_at']);
        });
    }
};
