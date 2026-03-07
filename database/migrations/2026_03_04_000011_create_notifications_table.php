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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 100);
            $table->string('title', 300);
            $table->text('body')->nullable();
            $table->string('entity_type', 191)->nullable();
            $table->string('entity_id', 64)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestampTz('read_at')->nullable();
            $table->string('channel', 30)->default('in_app');
            $table->json('meta')->nullable();
        });

        DB::statement('CREATE INDEX idx_notif_entity ON notifications (entity_type, entity_id)');
        DB::statement('CREATE INDEX idx_notif_user ON notifications (user_id)');
        DB::statement('CREATE INDEX idx_notif_is_read ON notifications (user_id, is_read)');
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
