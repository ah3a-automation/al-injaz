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
        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('name_ar', 255)->nullable();
            $table->string('slug', 255)->unique();
            $table->string('issuing_body', 255)->nullable();
            $table->text('description')->nullable();
            $table->boolean('requires_expiry')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();
        });
        DB::statement('CREATE INDEX idx_certifications_active ON certifications (is_active)');

        Schema::create('supplier_certification_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('certification_id')->constrained('certifications')->cascadeOnDelete();
            $table->string('certificate_number', 100)->nullable();
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestampsTz();
        });
        DB::statement('ALTER TABLE supplier_certification_assignments ADD CONSTRAINT uq_sup_cert_assign UNIQUE (supplier_id, certification_id)');
        DB::statement('CREATE INDEX idx_sup_cert_assign_supplier ON supplier_certification_assignments (supplier_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_certification_assignments');
        Schema::dropIfExists('certifications');
    }
};
