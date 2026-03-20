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
        if (Schema::hasTable('rfq_supplier_quotes') || ! Schema::hasTable('rfqs') || ! Schema::hasTable('suppliers')) {
            return;
        }

        Schema::create('rfq_supplier_quotes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->timestampTz('submitted_at')->nullable();
            $table->unsignedInteger('revision_no')->default(1);
            $table->string('status', 20)->default('draft');
            $table->decimal('total_amount', 18, 2)->nullable();
            $table->string('currency', 10)->default('SAR');
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE rfq_supplier_quotes ADD CONSTRAINT chk_rfsq_status CHECK (status IN ('draft','submitted','revised','accepted','rejected'))");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_rfsq_rfq_supplier ON rfq_supplier_quotes (rfq_id, supplier_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfsq_rfq ON rfq_supplier_quotes (rfq_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfsq_supplier ON rfq_supplier_quotes (supplier_id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE rfq_supplier_quotes DROP CONSTRAINT IF EXISTS chk_rfsq_status');
        Schema::dropIfExists('rfq_supplier_quotes');
    }
};
