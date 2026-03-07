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
        Schema::create('package_boq_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_package_id')->constrained('project_packages')->cascadeOnDelete();
            $table->foreignUuid('boq_item_id')->constrained('project_boq_items')->cascadeOnDelete();
            $table->decimal('allocated_budget_cost', 18, 2)->default(0.00);
            $table->decimal('qty_allocated', 15, 4)->nullable();
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->foreign('created_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
        });

        DB::statement("ALTER TABLE package_boq_items ADD CONSTRAINT uq_pbi_package_item UNIQUE (project_package_id, boq_item_id)");
        DB::statement('CREATE INDEX idx_pbi_package ON package_boq_items (project_package_id)');
        DB::statement('CREATE INDEX idx_pbi_item ON package_boq_items (boq_item_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('package_boq_items');
    }
};
