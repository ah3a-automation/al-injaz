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
        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                if (! Schema::hasColumn('contracts', 'retention_total_held')) {
                    $table->decimal('retention_total_held', 18, 2)->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'retention_total_released')) {
                    $table->decimal('retention_total_released', 18, 2)->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'retention_total_pending')) {
                    $table->decimal('retention_total_pending', 18, 2)->nullable()->default(0);
                }
            });
        }

        if (! Schema::hasTable('contract_retention_releases') && Schema::hasTable('contracts')) {
            Schema::create('contract_retention_releases', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('release_no', 100);
                $table->string('status', 30);
                $table->decimal('amount', 18, 2);
                $table->string('currency', 10);
                $table->text('reason')->nullable();
                $table->timestampTz('submitted_at')->nullable();
                $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('approved_at')->nullable();
                $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('rejected_at')->nullable();
                $table->foreignId('rejected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('released_at')->nullable();
                $table->foreignId('released_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('decision_notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_retention_releases ADD CONSTRAINT chk_crr_status CHECK (status IN ('pending','submitted','approved','rejected','released'))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_retention_releases_contract_no ON contract_retention_releases (contract_id, release_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_crr_contract_id ON contract_retention_releases (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_retention_releases')) {
            Schema::dropIfExists('contract_retention_releases');
        }
        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                foreach (['retention_total_pending', 'retention_total_released', 'retention_total_held'] as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
