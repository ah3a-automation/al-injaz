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
        if (Schema::hasTable('notification_settings')) {
            return;
        }

        Schema::create('notification_settings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            $table->string('event_key', 191)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('module', 100);

            $table->boolean('is_enabled')->default(false);

            $table->boolean('send_internal')->default(false);
            $table->boolean('send_email')->default(false);
            $table->boolean('send_broadcast')->default(false);
            $table->boolean('send_sms')->default(false);
            $table->boolean('send_whatsapp')->default(false);

            $table->string('delivery_mode', 20)->default('immediate');
            $table->string('digest_frequency', 20)->nullable();
            $table->string('environment_scope', 30)->default('all');

            $table->jsonb('conditions_json')->default(DB::raw("'{}'::jsonb"));

            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        DB::statement("ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_settings_delivery_mode CHECK (delivery_mode IN ('immediate','digest'))");
        DB::statement("ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_settings_environment_scope CHECK (environment_scope IN ('all','local_only','production_only'))");

        DB::statement('CREATE INDEX IF NOT EXISTS idx_ns_module ON notification_settings (module)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ns_environment_scope ON notification_settings (environment_scope)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS chk_notification_settings_delivery_mode');
        DB::statement('ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS chk_notification_settings_environment_scope');
        Schema::dropIfExists('notification_settings');
    }
};

