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
        if (! Schema::hasTable('notification_settings')) {
            return;
        }

        Schema::table('notification_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('notification_settings', 'source_event_key')) {
                $table->string('source_event_key', 191)->nullable()->after('event_key');
            }

            if (! Schema::hasColumn('notification_settings', 'template_event_code')) {
                $table->string('template_event_code', 191)->nullable()->after('source_event_key');
            }

            if (! Schema::hasColumn('notification_settings', 'notes')) {
                $table->text('notes')->nullable()->after('description');
            }
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_ns_enabled_env ON notification_settings (is_enabled, environment_scope)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ns_module_enabled ON notification_settings (module, is_enabled)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('notification_settings')) {
            return;
        }

        Schema::table('notification_settings', function (Blueprint $table): void {
            if (Schema::hasColumn('notification_settings', 'source_event_key')) {
                $table->dropColumn('source_event_key');
            }
            if (Schema::hasColumn('notification_settings', 'template_event_code')) {
                $table->dropColumn('template_event_code');
            }
            if (Schema::hasColumn('notification_settings', 'notes')) {
                $table->dropColumn('notes');
            }
        });

        DB::statement('DROP INDEX IF EXISTS idx_ns_enabled_env');
        DB::statement('DROP INDEX IF EXISTS idx_ns_module_enabled');
    }
};

