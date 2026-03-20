<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('suppliers') || Schema::hasColumn('suppliers', 'coordinates_locked')) {
            return;
        }

        Schema::table('suppliers', function (Blueprint $table) {
            $table->boolean('coordinates_locked')->default(false);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('suppliers') || ! Schema::hasColumn('suppliers', 'coordinates_locked')) {
            return;
        }

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn('coordinates_locked');
        });
    }
};
