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
        if (Schema::hasTable('notification_recipients')) {
            return;
        }

        if (! Schema::hasTable('notification_settings')) {
            return;
        }

        Schema::create('notification_recipients', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('notification_setting_id')->constrained('notification_settings');

            $table->string('recipient_type', 60);
            $table->string('role_name', 255)->nullable();

            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->boolean('is_enabled')->default(true);

            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        DB::statement("ALTER TABLE notification_recipients ADD CONSTRAINT chk_notification_recipients_type CHECK (recipient_type IN ('role','user','supplier_user','assigned_user','creator','approver','subject_owner','specific_user'))");

        DB::statement('CREATE INDEX IF NOT EXISTS idx_nr_setting ON notification_recipients (notification_setting_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_nr_type ON notification_recipients (recipient_type)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE notification_recipients DROP CONSTRAINT IF EXISTS chk_notification_recipients_type');
        Schema::dropIfExists('notification_recipients');
    }
};

