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
        if (! Schema::hasTable('contract_claims') && Schema::hasTable('contracts')) {
            Schema::create('contract_claims', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('claim_no', 100);
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->string('status', 30);
                $table->timestampTz('submitted_at')->nullable();
                $table->timestampTz('resolved_at')->nullable();
                $table->timestampTz('rejected_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_claims ADD CONSTRAINT chk_contract_claims_status CHECK (status IN ('draft','submitted','under_review','resolved','rejected'))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_claims_contract_no ON contract_claims (contract_id, claim_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contract_claims_contract_id ON contract_claims (contract_id)');
        }

        if (! Schema::hasTable('contract_notices') && Schema::hasTable('contracts')) {
            Schema::create('contract_notices', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('notice_no', 100);
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->string('status', 30);
                $table->timestampTz('issued_at')->nullable();
                $table->timestampTz('responded_at')->nullable();
                $table->timestampTz('closed_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_notices ADD CONSTRAINT chk_contract_notices_status CHECK (status IN ('draft','issued','responded','closed'))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_notices_contract_no ON contract_notices (contract_id, notice_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contract_notices_contract_id ON contract_notices (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_notices')) {
            Schema::dropIfExists('contract_notices');
        }
        if (Schema::hasTable('contract_claims')) {
            Schema::dropIfExists('contract_claims');
        }
    }
};
