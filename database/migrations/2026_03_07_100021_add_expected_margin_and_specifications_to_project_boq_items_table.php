<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->decimal('expected_margin', 14, 2)->nullable()->after('planned_cost');
            $table->text('specifications')->nullable()->after('expected_margin');
        });
    }

    public function down(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->dropColumn(['expected_margin', 'specifications']);
        });
    }
};
