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
        Schema::create('project_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_in_project', 50)->default('member');
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('assigned_at')->useCurrent();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->unique(['project_id', 'user_id'], 'uq_pm_project_user');
        });

        DB::statement('ALTER TABLE project_memberships ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('CREATE INDEX idx_pm_user ON project_memberships (user_id)');
        DB::statement('CREATE INDEX idx_pm_expires ON project_memberships (expires_at)');
    }

    public function down(): void
    {
        Schema::dropIfExists('project_memberships');
    }
};
