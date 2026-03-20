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
                if (! Schema::hasColumn('contracts', 'closeout_status')) {
                    $table->string('closeout_status', 30)->default('not_ready');
                }
                if (! Schema::hasColumn('contracts', 'closeout_initialized_at')) {
                    $table->timestampTz('closeout_initialized_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'closeout_initialized_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('closeout_initialized_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('contracts', 'closeout_completed_at')) {
                    $table->timestampTz('closeout_completed_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'closeout_completed_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('closeout_completed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('contracts', 'practical_completion_at')) {
                    $table->timestampTz('practical_completion_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'final_completion_at')) {
                    $table->timestampTz('final_completion_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'closeout_notes')) {
                    $table->text('closeout_notes')->nullable();
                }
            });

            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_closeout_status');
            DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_closeout_status CHECK (closeout_status IN ('not_ready','ready_for_closeout','closed_out'))");
        }

        if (! Schema::hasTable('contract_closeout_records') && Schema::hasTable('contracts')) {
            Schema::create('contract_closeout_records', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('closeout_status', 30);
                $table->timestampTz('practical_completion_at')->nullable();
                $table->timestampTz('final_completion_at')->nullable();
                $table->text('closeout_notes')->nullable();
                $table->foreignId('prepared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('prepared_at');
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });

            DB::statement("ALTER TABLE contract_closeout_records ADD CONSTRAINT chk_ccr_closeout_status CHECK (closeout_status IN ('not_ready','ready_for_closeout','closed_out'))");
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ccr_contract_id ON contract_closeout_records (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_closeout_records')) {
            Schema::dropIfExists('contract_closeout_records');
        }

        if (Schema::hasTable('contracts')) {
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_closeout_status');
            Schema::table('contracts', function (Blueprint $table): void {
                foreach (['closeout_notes', 'final_completion_at', 'practical_completion_at', 'closeout_completed_by_user_id', 'closeout_completed_at', 'closeout_initialized_by_user_id', 'closeout_initialized_at', 'closeout_status'] as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        if (in_array($col, ['closeout_initialized_by_user_id', 'closeout_completed_by_user_id'], true)) {
                            $table->dropConstrainedForeignId($col);
                        } else {
                            $table->dropColumn($col);
                        }
                    }
                }
            });
        }
    }
};
