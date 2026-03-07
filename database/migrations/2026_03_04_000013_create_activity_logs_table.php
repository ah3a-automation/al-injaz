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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('causer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 100);
            $table->string('subject_type', 191);
            $table->string('subject_id', 64);
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX idx_al_causer ON activity_logs (causer_user_id)');
        DB::statement('CREATE INDEX idx_al_subject ON activity_logs (subject_type, subject_id)');
        DB::statement('CREATE INDEX idx_al_event ON activity_logs (event)');
        DB::statement('CREATE INDEX idx_al_created ON activity_logs (created_at DESC)');
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
