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
        if (Schema::hasTable('user_notification_preferences')) {
            return;
        }

        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_key', 100);
            $table->string('channel', 20);
            $table->boolean('is_enabled')->default(true);
            $table->timestampsTz();

            $table->unique(['user_id', 'event_key', 'channel'], 'uq_unp_user_event_channel');
        });

        DB::statement("ALTER TABLE user_notification_preferences ADD CONSTRAINT chk_unp_channel CHECK (channel IN ('inapp','email','whatsapp','sms'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE user_notification_preferences DROP CONSTRAINT IF EXISTS chk_unp_channel');
        Schema::dropIfExists('user_notification_preferences');
    }
};
