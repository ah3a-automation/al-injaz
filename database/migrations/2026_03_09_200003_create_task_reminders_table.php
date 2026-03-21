<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_reminders', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('remind_at');
            $table->string('note', 500)->nullable();
            $table->boolean('is_sent')->default(false);
            $table->timestampTz('sent_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index('task_id', 'idx_task_reminders_task');
            $table->index('user_id', 'idx_task_reminders_user');
            $table->index(['remind_at', 'is_sent'], 'idx_task_reminders_remind_sent');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_reminders');
    }
};
