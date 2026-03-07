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
        Schema::create('boq_versions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedInteger('version_no')->default(1);
            $table->string('label', 100)->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('imported_by')->nullable();
            $table->foreign('imported_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('imported_at')->nullable();
            $table->unsignedInteger('item_count')->default(0);
            $table->decimal('total_revenue', 18, 2)->default(0.00);
            $table->decimal('total_planned_cost', 18, 2)->default(0.00);
            $table->jsonb('diff_summary_json')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE boq_versions ADD CONSTRAINT chk_bv_status CHECK (status IN ('draft','imported','active','archived'))");
        DB::statement('CREATE INDEX idx_bv_project ON boq_versions (project_id)');
        DB::statement('CREATE INDEX idx_bv_status ON boq_versions (status)');
        DB::statement('CREATE UNIQUE INDEX uq_bv_project_version ON boq_versions (project_id, version_no)');
        DB::statement("CREATE UNIQUE INDEX uq_bv_active_project ON boq_versions (project_id) WHERE status = 'active'");
    }

    public function down(): void
    {
        Schema::dropIfExists('boq_versions');
    }
};
