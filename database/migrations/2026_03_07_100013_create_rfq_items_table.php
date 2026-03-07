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
        Schema::create('rfq_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('boq_item_id')->nullable()->constrained('project_boq_items')->nullOnDelete();
            $table->foreignUuid('pr_item_id')->nullable()->constrained('purchase_request_items')->nullOnDelete();
            $table->string('code', 100)->nullable();
            $table->text('description_ar')->nullable();
            $table->text('description_en');
            $table->string('unit', 50)->nullable();
            $table->decimal('qty', 15, 4)->nullable();
            $table->decimal('estimated_cost', 18, 2)->default(0.00);
            $table->integer('sort_order')->default(0);
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('ALTER TABLE rfq_items ADD CONSTRAINT chk_ri_source CHECK (boq_item_id IS NOT NULL OR pr_item_id IS NOT NULL)');
        DB::statement('CREATE INDEX idx_ri_rfq ON rfq_items (rfq_id)');
        DB::statement('CREATE INDEX idx_ri_boq ON rfq_items (boq_item_id) WHERE boq_item_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_ri_pr_item ON rfq_items (pr_item_id) WHERE pr_item_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_items');
    }
};
