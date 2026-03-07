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
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('notification_type', 100);
            $table->string('channel', 30);
            $table->boolean('enabled')->default(true);
            $table->json('settings')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->unique(['user_id', 'notification_type', 'channel'], 'uq_np_user_type_channel');
        });

        DB::statement('ALTER TABLE notification_preferences ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('CREATE INDEX idx_np_user ON notification_preferences (user_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
