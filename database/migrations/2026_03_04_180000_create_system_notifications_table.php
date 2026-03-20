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
        Schema::create('system_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notifiable_type', 191)->nullable();
            $table->string('notifiable_id', 64)->nullable();
            $table->string('event_key', 100);
            $table->string('title', 255);
            $table->text('message');
            $table->string('link', 500)->nullable();
            $table->string('status', 20)->default('pending');
            $table->json('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE system_notifications ADD CONSTRAINT chk_sn_status CHECK (status IN ('pending','sent','read'))");
        DB::statement('CREATE INDEX idx_sn_user ON system_notifications (user_id)');
        DB::statement('CREATE INDEX idx_sn_event ON system_notifications (event_key)');
        DB::statement('CREATE INDEX idx_sn_created ON system_notifications (created_at)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE system_notifications DROP CONSTRAINT IF EXISTS chk_sn_status');
        Schema::dropIfExists('system_notifications');
    }
};
