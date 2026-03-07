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
        Schema::create('project_boq_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('boq_version_id')->constrained('boq_versions')->cascadeOnDelete();
            $table->foreignUuid('system_id')->nullable()->constrained('project_systems')->nullOnDelete();
            $table->string('code', 100);
            $table->text('description_ar')->nullable();
            $table->text('description_en');
            $table->string('unit', 50)->nullable();
            $table->decimal('qty', 15, 4)->nullable();
            $table->decimal('unit_price', 18, 4)->nullable();
            $table->decimal('revenue_amount', 18, 2)->default(0.00);
            $table->decimal('planned_cost', 18, 2)->default(0.00);
            $table->string('lead_type', 10)->default('short');
            $table->boolean('is_provisional')->default(false);
            $table->uuid('parent_item_id')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE project_boq_items ADD CONSTRAINT chk_bi_revenue_non_negative CHECK (revenue_amount >= 0)");
        DB::statement("ALTER TABLE project_boq_items ADD CONSTRAINT chk_bi_planned_cost_non_negative CHECK (planned_cost >= 0)");
        DB::statement("ALTER TABLE project_boq_items ADD CONSTRAINT chk_bi_lead_type CHECK (lead_type IN ('long','short'))");
        DB::statement('CREATE INDEX idx_bi_version ON project_boq_items (boq_version_id)');
        DB::statement('CREATE INDEX idx_bi_project ON project_boq_items (project_id)');
        DB::statement('CREATE INDEX idx_bi_project_version ON project_boq_items (project_id, boq_version_id)');
        DB::statement('CREATE INDEX idx_bi_system ON project_boq_items (system_id) WHERE system_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_bi_lead_type ON project_boq_items (lead_type)');
        DB::statement('CREATE INDEX idx_bi_parent ON project_boq_items (parent_item_id) WHERE parent_item_id IS NOT NULL');
        DB::statement("CREATE INDEX idx_bi_fts ON project_boq_items USING GIN(to_tsvector('simple', COALESCE(code,'') || ' ' || COALESCE(description_en,'') || ' ' || COALESCE(description_ar,'')))");

        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->foreign('parent_item_id')->references('id')->on('project_boq_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_boq_items');
    }
};
