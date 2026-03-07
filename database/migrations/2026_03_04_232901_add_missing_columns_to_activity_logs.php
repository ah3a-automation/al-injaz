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
        // Add missing columns
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->jsonb('context')->nullable()->after('new_values');
            $table->string('user_agent')->nullable()->after('ip_address');
        });

        // Upgrade json → jsonb for better performance
        DB::statement('ALTER TABLE activity_logs ALTER COLUMN old_values TYPE jsonb USING old_values::jsonb');
        DB::statement('ALTER TABLE activity_logs ALTER COLUMN new_values TYPE jsonb USING new_values::jsonb');
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn(['context', 'user_agent']);
        });

        DB::statement('ALTER TABLE activity_logs ALTER COLUMN old_values TYPE json USING old_values::json');
        DB::statement('ALTER TABLE activity_logs ALTER COLUMN new_values TYPE json USING new_values::json');
    }
};