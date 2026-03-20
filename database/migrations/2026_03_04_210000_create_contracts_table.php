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
        if (
            Schema::hasTable('contracts')
            || ! Schema::hasTable('rfqs')
            || ! Schema::hasTable('suppliers')
            || ! Schema::hasTable('procurement_packages')
        ) {
            return;
        }

        Schema::create('contracts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->restrictOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->foreignUuid('package_id')->nullable()->constrained('procurement_packages')->nullOnDelete();
            $table->string('contract_number', 100);
            $table->decimal('contract_value', 14, 2);
            $table->string('currency', 10)->default('SAR');
            $table->string('status', 50)->default('draft');
            $table->timestampTz('signed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_status CHECK (status IN ('draft', 'pending_signature', 'active', 'completed', 'terminated'))");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_rfq ON contracts (rfq_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON contracts (supplier_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_package ON contracts (package_id)');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_contract_number ON contracts (contract_number)');
        DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_contract_value CHECK (contract_value >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
