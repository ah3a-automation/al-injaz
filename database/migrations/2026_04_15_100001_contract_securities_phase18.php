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
        if (! Schema::hasTable('contract_securities') && Schema::hasTable('contracts')) {
            Schema::create('contract_securities', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('instrument_type', 50);
                $table->string('status', 30);
                $table->string('provider_name', 255);
                $table->string('reference_no', 255);
                $table->decimal('amount', 18, 2)->nullable();
                $table->string('currency', 10)->nullable();
                $table->timestampTz('issued_at')->nullable();
                $table->timestampTz('expires_at')->nullable();
                $table->timestampTz('released_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_securities ADD CONSTRAINT chk_contract_securities_type CHECK (instrument_type IN ('performance_bond','advance_payment_guarantee','retention_bond','insurance'))");
            DB::statement("ALTER TABLE contract_securities ADD CONSTRAINT chk_contract_securities_status CHECK (status IN ('active','expiring','expired','released'))");
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contract_securities_contract_id ON contract_securities (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_securities')) {
            Schema::dropIfExists('contract_securities');
        }
    }
};
