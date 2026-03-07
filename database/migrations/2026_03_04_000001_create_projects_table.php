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
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('active');
            $table->foreignId('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->timestampTz('deleted_at')->nullable();
        });

        DB::statement('ALTER TABLE projects ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('CREATE INDEX idx_projects_owner ON projects (owner_user_id)');
        DB::statement('CREATE INDEX idx_projects_status ON projects (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
