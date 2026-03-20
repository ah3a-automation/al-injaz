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
        if (Schema::hasTable('contract_invoices') || ! Schema::hasTable('contracts')) {
            return;
        }

        Schema::create('contract_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('invoice_no', 100);
            $table->date('invoice_date');
            $table->decimal('amount', 14, 2);
            $table->decimal('retention_amount', 14, 2)->default(0);
            $table->decimal('net_amount', 14, 2);
            $table->string('currency', 10);
            $table->string('status', 50)->default('draft');
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->foreign('submitted_by')->references('id')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE contract_invoices ADD CONSTRAINT chk_ci_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid'))");
        DB::statement("ALTER TABLE contract_invoices ADD CONSTRAINT chk_ci_amounts CHECK (amount >= 0 AND retention_amount >= 0 AND net_amount >= 0 AND retention_amount <= amount)");
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_contract ON contract_invoices (contract_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_invoice_no ON contract_invoices (invoice_no)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_status ON contract_invoices (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_invoices');
    }
};
