<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('linkable_type', 100);
            $table->string('linkable_id', 100);
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['task_id', 'linkable_type', 'linkable_id'], 'uq_task_links');
            $table->index('task_id', 'idx_task_links_task');
            $table->index(['linkable_type', 'linkable_id'], 'idx_task_links_linkable');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_links');
    }
};
