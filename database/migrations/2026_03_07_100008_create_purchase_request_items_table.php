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
        Schema::create('purchase_request_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('purchase_request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->foreignUuid('boq_item_id')->nullable()->constrained('project_boq_items')->nullOnDelete();
            $table->foreignUuid('package_id')->nullable()->constrained('project_packages')->nullOnDelete();
            $table->text('description_ar')->nullable();
            $table->text('description_en');
            $table->string('unit', 50)->nullable();
            $table->decimal('qty', 15, 4)->nullable();
            $table->decimal('estimated_cost', 18, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE purchase_request_items ADD CONSTRAINT chk_pri_estimated_cost CHECK (estimated_cost >= 0)");
        DB::statement('CREATE INDEX idx_pri_request ON purchase_request_items (purchase_request_id)');
        DB::statement('CREATE INDEX idx_pri_boq ON purchase_request_items (boq_item_id) WHERE boq_item_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_pri_package ON purchase_request_items (package_id) WHERE package_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_request_items');
    }
};
