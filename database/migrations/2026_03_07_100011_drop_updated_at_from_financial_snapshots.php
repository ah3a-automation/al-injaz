<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_snapshots', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('financial_snapshots', function (Blueprint $table) {
            $table->timestampTz('updated_at')->nullable();
        });
    }
};
