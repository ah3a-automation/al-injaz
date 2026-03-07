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
        Schema::create('procurement_package_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('package_id')->constrained('procurement_packages')->cascadeOnDelete();
            $table->foreignUuid('boq_item_id')->constrained('project_boq_items')->cascadeOnDelete();
            $table->timestampsTz();
        });

        DB::statement('CREATE UNIQUE INDEX uq_ppi_package_boq ON procurement_package_items (package_id, boq_item_id)');
        DB::statement('CREATE INDEX idx_ppi_package ON procurement_package_items (package_id)');
        DB::statement('CREATE INDEX idx_ppi_boq_item ON procurement_package_items (boq_item_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_package_items');
    }
};
