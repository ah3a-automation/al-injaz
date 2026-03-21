<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Performance indexes for hot paths (suppliers listing, notification inbox).
 * Named indexes created via DB::statement per project governance (index placement).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('suppliers')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers (created_at)');
        }

        if (Schema::hasTable('system_notifications')) {
            DB::statement("CREATE INDEX IF NOT EXISTS idx_sn_user_unread ON system_notifications (user_id) WHERE status <> 'read'");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('suppliers')) {
            DB::statement('DROP INDEX IF EXISTS idx_suppliers_created_at');
        }

        if (Schema::hasTable('system_notifications')) {
            DB::statement('DROP INDEX IF EXISTS idx_sn_user_unread');
        }
    }
};
