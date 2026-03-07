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
        Schema::dropIfExists('task_attachments');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('task_assignees');
        Schema::dropIfExists('tasks');

        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->uuid('parent_task_id')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('backlog');
            $table->string('priority', 10)->default('normal');
            $table->timestampTz('due_at')->nullable();
            $table->timestampTz('start_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('actual_hours', 8, 2)->nullable();
            $table->smallInteger('progress_percent')->default(0);
            $table->integer('position')->default(0);
            $table->string('visibility', 20)->default('team');
            $table->string('source', 20)->default('manual');
            $table->timestampTz('deleted_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE tasks ADD CONSTRAINT tasks_parent_task_id_foreign FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL');
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('backlog','open','in_progress','review','done','cancelled'))");
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_priority CHECK (priority IN ('low','normal','high','urgent'))");
        DB::statement('ALTER TABLE tasks ADD CONSTRAINT chk_tasks_progress CHECK (progress_percent BETWEEN 0 AND 100)');
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_visibility CHECK (visibility IN ('is_private','team','project'))");
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_source CHECK (source IN ('manual','rfq','contract','system'))");
        DB::statement('CREATE INDEX idx_tasks_project ON tasks (project_id)');
        DB::statement('CREATE INDEX idx_tasks_parent ON tasks (parent_task_id)');
        DB::statement('CREATE INDEX idx_tasks_creator ON tasks (created_by_user_id)');
        DB::statement('CREATE INDEX idx_tasks_status ON tasks (status)');
        DB::statement('CREATE INDEX idx_tasks_due ON tasks (due_at)');
        DB::statement('CREATE INDEX idx_tasks_project_status ON tasks (project_id, status)');
        DB::statement('CREATE INDEX idx_tasks_parent_position ON tasks (parent_task_id, position)');

        Schema::create('task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('responsible');
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE task_assignees ADD CONSTRAINT chk_task_assignees_role CHECK (role IN ('responsible','reviewer','watcher'))");
        DB::statement('ALTER TABLE task_assignees ADD CONSTRAINT uq_task_assignees UNIQUE (task_id, user_id)');
        DB::statement('CREATE INDEX idx_task_assignees_task ON task_assignees (task_id)');
        DB::statement('CREATE INDEX idx_task_assignees_user ON task_assignees (user_id)');

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignUuid('depends_on_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('ALTER TABLE task_dependencies ADD CONSTRAINT uq_task_dependencies UNIQUE (task_id, depends_on_task_id)');
        DB::statement('ALTER TABLE task_dependencies ADD CONSTRAINT chk_no_self_dependency CHECK (task_id <> depends_on_task_id)');
        DB::statement('CREATE INDEX idx_task_dependencies_task ON task_dependencies (task_id)');

        Schema::create('task_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestampTz('deleted_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement('CREATE INDEX idx_task_comments_task ON task_comments (task_id)');

        Schema::create('task_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX idx_task_attachments_task ON task_attachments (task_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('task_attachments');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('task_assignees');
        Schema::dropIfExists('tasks');
    }
};
