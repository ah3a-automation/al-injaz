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
        Schema::create('supplier_capabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('supplier_categories')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('name_ar', 255)->nullable();
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();
        });
        DB::statement('CREATE INDEX idx_sup_capabilities_category ON supplier_capabilities (category_id)');
        DB::statement('CREATE INDEX idx_sup_capabilities_active ON supplier_capabilities (is_active)');

        Schema::create('supplier_capability_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('capability_id')->constrained('supplier_capabilities')->cascadeOnDelete();
            $table->string('proficiency_level', 20)->default('standard');
            $table->integer('years_experience')->nullable();
            $table->timestampsTz();
        });
        DB::statement("ALTER TABLE supplier_capability_assignments ADD CONSTRAINT chk_proficiency CHECK (proficiency_level IN ('basic','standard','advanced','expert'))");
        DB::statement('ALTER TABLE supplier_capability_assignments ADD CONSTRAINT uq_sup_cap_assign UNIQUE (supplier_id, capability_id)');
        DB::statement('CREATE INDEX idx_sup_cap_assign_supplier ON supplier_capability_assignments (supplier_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_capability_assignments');
        Schema::dropIfExists('supplier_capabilities');
    }
};
