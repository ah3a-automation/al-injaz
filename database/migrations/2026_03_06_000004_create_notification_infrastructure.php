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
        if (! Schema::hasTable('notification_templates')) {
            Schema::create('notification_templates', function (Blueprint $table) {
                $table->id();
                $table->string('event_code', 100)->unique();
                $table->string('name', 255);
                $table->string('subject', 255)->nullable();
                $table->text('body_text');
                $table->text('body_html')->nullable();
                $table->string('type', 20)->default('info');
                $table->boolean('email_enabled')->default(true);
                $table->boolean('inapp_enabled')->default(true);
                $table->boolean('whatsapp_enabled')->default(false);
                $table->boolean('sms_enabled')->default(false);
                $table->timestamps();
            });
            DB::statement("ALTER TABLE notification_templates ADD CONSTRAINT chk_notif_type CHECK (type IN ('info','success','warning','danger'))");
            Schema::table('notification_templates', function (Blueprint $table) {
                $table->index('event_code', 'idx_notif_templates_event');
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'idx_notifications_notifiable');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('notification_templates')) {
            Schema::dropIfExists('notification_templates');
        }
        // Do not drop notifications table in down() — may be pre-existing (governance)
    }
};
