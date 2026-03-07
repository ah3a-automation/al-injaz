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
        Schema::create('project_systems', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('name_ar', 200)->nullable();
            $table->string('name_en', 200);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('owner_user_id')->nullable();
            $table->foreign('owner_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->foreign('created_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
        });

        DB::statement('CREATE INDEX idx_ps_project ON project_systems (project_id)');
        DB::statement('CREATE INDEX idx_ps_owner ON project_systems (owner_user_id) WHERE owner_user_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX uq_ps_project_code ON project_systems (project_id, code) WHERE code IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('project_systems');
    }
};
