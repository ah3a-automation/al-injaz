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
        Schema::create('project_packages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('system_id')->nullable()->constrained('project_systems')->nullOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('name_ar', 300)->nullable();
            $table->string('name_en', 300);
            $table->string('scope_type', 30)->default('general');
            $table->decimal('budget_cost', 18, 2)->default(0.00);
            $table->decimal('planned_cost', 18, 2)->default(0.00);
            $table->decimal('awarded_cost', 18, 2)->default(0.00);
            $table->decimal('forecast_cost', 18, 2)->default(0.00);
            $table->string('status', 30)->default('draft');
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->foreign('created_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE project_packages ADD CONSTRAINT chk_pp_scope_type CHECK (scope_type IN ('general','supply','works','services'))");
        DB::statement("ALTER TABLE project_packages ADD CONSTRAINT chk_pp_status CHECK (status IN ('draft','active','awarded','closed'))");
        DB::statement('CREATE INDEX idx_pp_project ON project_packages (project_id)');
        DB::statement('CREATE INDEX idx_pp_system ON project_packages (system_id) WHERE system_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_pp_status ON project_packages (status)');
        DB::statement('CREATE UNIQUE INDEX uq_pp_project_code ON project_packages (project_id, code) WHERE code IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('project_packages');
    }
};
