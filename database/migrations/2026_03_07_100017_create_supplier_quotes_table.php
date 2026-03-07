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
        Schema::create('supplier_quotes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignUuid('rfq_supplier_id')->constrained('rfq_suppliers')->cascadeOnDelete();
            $table->unsignedInteger('version_no')->default(1);
            $table->decimal('total_price', 18, 2)->default(0.00);
            $table->string('currency', 3)->default('SAR');
            $table->integer('validity_days')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status', 20)->default('draft');
            $table->string('attachment_path', 500)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->foreign('submitted_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('submitted_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE supplier_quotes ADD CONSTRAINT chk_sq_status CHECK (status IN ('draft','submitted','withdrawn'))");
        DB::statement("ALTER TABLE supplier_quotes ADD CONSTRAINT chk_sq_total_price CHECK (total_price >= 0)");
        DB::statement('CREATE INDEX idx_sq_rfq ON supplier_quotes (rfq_id)');
        DB::statement('CREATE INDEX idx_sq_supplier ON supplier_quotes (supplier_id)');
        DB::statement('CREATE INDEX idx_sq_status ON supplier_quotes (status)');
        DB::statement('CREATE UNIQUE INDEX uq_sq_rfq_supplier_version ON supplier_quotes (rfq_id, supplier_id, version_no)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_quotes');
    }
};
