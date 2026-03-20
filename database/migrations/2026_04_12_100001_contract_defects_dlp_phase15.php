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
                if (! Schema::hasColumn('contracts', 'defects_liability_start_at')) {
                    $table->timestampTz('defects_liability_start_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'defects_liability_end_at')) {
                    $table->timestampTz('defects_liability_end_at')->nullable();
                }
                if (! Schema::hasColumn('contracts', 'warranty_status')) {
                    $table->string('warranty_status', 30)->nullable()->default('open');
                }
            });
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_warranty_status');
            DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_warranty_status CHECK (warranty_status IS NULL OR warranty_status IN ('open','closed'))");
        }

        if (! Schema::hasTable('contract_defect_items') && Schema::hasTable('contracts')) {
            Schema::create('contract_defect_items', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('reference_no', 100);
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->string('status', 30);
                $table->timestampTz('reported_at')->nullable();
                $table->timestampTz('resolved_at')->nullable();
                $table->timestampTz('closed_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement("ALTER TABLE contract_defect_items ADD CONSTRAINT chk_cdi_status CHECK (status IN ('open','in_progress','resolved','closed'))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_defect_items_contract_ref ON contract_defect_items (contract_id, reference_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_cdi_contract_id ON contract_defect_items (contract_id)');
        }

        if (! Schema::hasTable('contract_defect_events') && Schema::hasTable('contract_defect_items')) {
            Schema::create('contract_defect_events', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_defect_item_id')->constrained('contract_defect_items')->cascadeOnDelete();
                $table->string('old_status', 50)->nullable();
                $table->string('new_status', 50)->nullable();
                $table->text('event_notes')->nullable();
                $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable()->useCurrent();
            });
            DB::statement('CREATE INDEX IF NOT EXISTS idx_cde_defect_item_id ON contract_defect_events (contract_defect_item_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_defect_events')) {
            Schema::dropIfExists('contract_defect_events');
        }
        if (Schema::hasTable('contract_defect_items')) {
            Schema::dropIfExists('contract_defect_items');
        }
        if (Schema::hasTable('contracts')) {
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_warranty_status');
            Schema::table('contracts', function (Blueprint $table): void {
                foreach (['warranty_status', 'defects_liability_end_at', 'defects_liability_start_at'] as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
