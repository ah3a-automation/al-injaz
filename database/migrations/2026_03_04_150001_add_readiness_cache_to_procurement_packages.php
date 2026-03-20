<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('procurement_packages')) {
            return;
        }

        Schema::table('procurement_packages', function (Blueprint $table) {
            if (! Schema::hasColumn('procurement_packages', 'readiness_score')) {
                $table->unsignedInteger('readiness_score')->default(0)->after('status');
            }
            if (! Schema::hasColumn('procurement_packages', 'readiness_cached_at')) {
                $table->timestampTz('readiness_cached_at')->nullable()->after('readiness_score');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('procurement_packages')) {
            return;
        }

        Schema::table('procurement_packages', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_packages', 'readiness_score')) {
                $table->dropColumn('readiness_score');
            }
            if (Schema::hasColumn('procurement_packages', 'readiness_cached_at')) {
                $table->dropColumn('readiness_cached_at');
            }
        });
    }
};
