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
        if (! Schema::hasTable('notification_recipients')) {
            return;
        }

        Schema::table('notification_recipients', function (Blueprint $table): void {
            if (! Schema::hasColumn('notification_recipients', 'recipient_value')) {
                $table->string('recipient_value', 255)->nullable()->after('user_id');
            }

            if (! Schema::hasColumn('notification_recipients', 'resolver_config_json')) {
                $table->jsonb('resolver_config_json')->nullable()->after('recipient_value');
            }

            if (! Schema::hasColumn('notification_recipients', 'channel_override')) {
                $table->string('channel_override', 60)->nullable()->after('resolver_config_json');
            }

            if (! Schema::hasColumn('notification_recipients', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('channel_override');
            }
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_nr_setting_type_sort ON notification_recipients (notification_setting_id, recipient_type, sort_order)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_nr_setting_sort ON notification_recipients (notification_setting_id, sort_order)');

        // Deduplication across seeder runs. We use expressions to treat NULLs as stable
        // values for uniqueness to avoid multiple "same" recipients being inserted.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_nr_dedup ON notification_recipients (
            notification_setting_id,
            recipient_type,
            coalesce(role_name, \'\'),
            coalesce(user_id, -1),
            coalesce(recipient_value, \'\'),
            coalesce(channel_override, \'\')
        )');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_nr_dedup');
        DB::statement('DROP INDEX IF EXISTS idx_nr_setting_type_sort');
        DB::statement('DROP INDEX IF EXISTS idx_nr_setting_sort');

        Schema::table('notification_recipients', function (Blueprint $table): void {
            if (Schema::hasColumn('notification_recipients', 'recipient_value')) {
                $table->dropColumn('recipient_value');
            }
            if (Schema::hasColumn('notification_recipients', 'resolver_config_json')) {
                $table->dropColumn('resolver_config_json');
            }
            if (Schema::hasColumn('notification_recipients', 'channel_override')) {
                $table->dropColumn('channel_override');
            }
            if (Schema::hasColumn('notification_recipients', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
        });
    }
};

