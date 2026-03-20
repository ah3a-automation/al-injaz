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
        if (! Schema::hasTable('contract_obligations') && Schema::hasTable('contracts')) {
            Schema::create('contract_obligations', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('reference_no', 100);
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->string('party_type', 30);
                $table->string('status', 30);
                $table->timestampTz('due_at')->nullable();
                $table->timestampTz('submitted_at')->nullable();
                $table->timestampTz('fulfilled_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_obligations ADD CONSTRAINT chk_contract_obligations_status CHECK (status IN ('not_started','in_progress','submitted','fulfilled','overdue'))");
            DB::statement("ALTER TABLE contract_obligations ADD CONSTRAINT chk_contract_obligations_party_type CHECK (party_type IN ('internal','supplier','client','consultant'))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_obligations_contract_ref ON contract_obligations (contract_id, reference_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contract_obligations_contract_id ON contract_obligations (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_obligations')) {
            Schema::dropIfExists('contract_obligations');
        }
    }
};
