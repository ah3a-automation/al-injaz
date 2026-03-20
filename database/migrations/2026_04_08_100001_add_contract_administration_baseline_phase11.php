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
        if (Schema::hasTable('contracts') && Schema::hasTable('users')) {
            Schema::table('contracts', function (Blueprint $table): void {
                if (! Schema::hasColumn('contracts', 'administration_status')) {
                    $table->string('administration_status', 30)->default('not_initialized')->after('executed_by_user_id');
                }
                if (! Schema::hasColumn('contracts', 'administration_initialized_at')) {
                    $table->timestampTz('administration_initialized_at')->nullable()->after('administration_status');
                }
                if (! Schema::hasColumn('contracts', 'administration_initialized_by_user_id')) {
                    $table->foreignId('administration_initialized_by_user_id')
                        ->nullable()
                        ->after('administration_initialized_at')
                        ->constrained('users')
                        ->nullOnDelete();
                }
                if (! Schema::hasColumn('contracts', 'administration_notes')) {
                    $table->text('administration_notes')->nullable()->after('administration_initialized_by_user_id');
                }
                if (! Schema::hasColumn('contracts', 'effective_date')) {
                    $table->timestampTz('effective_date')->nullable()->after('administration_notes');
                }
                if (! Schema::hasColumn('contracts', 'commencement_date')) {
                    $table->timestampTz('commencement_date')->nullable()->after('effective_date');
                }
                if (! Schema::hasColumn('contracts', 'completion_date_planned')) {
                    $table->timestampTz('completion_date_planned')->nullable()->after('commencement_date');
                }
                if (! Schema::hasColumn('contracts', 'contract_value_final')) {
                    $table->decimal('contract_value_final', 18, 2)->nullable()->after('completion_date_planned');
                }
                if (! Schema::hasColumn('contracts', 'currency_final')) {
                    $table->string('currency_final', 10)->nullable()->after('contract_value_final');
                }
                if (! Schema::hasColumn('contracts', 'supplier_reference_no')) {
                    $table->string('supplier_reference_no', 255)->nullable()->after('currency_final');
                }
            });

            DB::statement("
                ALTER TABLE contracts
                ADD CONSTRAINT chk_contracts_administration_status
                CHECK (administration_status IN ('not_initialized','initialized'))
            ");
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_administration_baselines')) {
            Schema::create('contract_administration_baselines', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->unsignedInteger('baseline_version');
                $table->string('administration_status', 30);
                $table->timestampTz('effective_date')->nullable();
                $table->timestampTz('commencement_date')->nullable();
                $table->timestampTz('completion_date_planned')->nullable();
                $table->decimal('contract_value_final', 18, 2)->nullable();
                $table->string('currency_final', 10)->nullable();
                $table->string('supplier_reference_no', 255)->nullable();
                $table->text('administration_notes')->nullable();
                $table->foreignId('prepared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('prepared_at');
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_administration_baselines
                ADD CONSTRAINT chk_contract_administration_baselines_status
                CHECK (administration_status IN ('not_initialized','initialized'))
            ");
            DB::statement("
                ALTER TABLE contract_administration_baselines
                ADD CONSTRAINT uq_contract_administration_baselines_version
                UNIQUE (contract_id, baseline_version)
            ");
            DB::statement('CREATE INDEX idx_contract_administration_baselines_contract ON contract_administration_baselines (contract_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_administration_baselines')) {
            Schema::dropIfExists('contract_administration_baselines');
        }

        if (Schema::hasTable('contracts')) {
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_administration_status');
            Schema::table('contracts', function (Blueprint $table): void {
                $cols = [
                    'supplier_reference_no',
                    'currency_final',
                    'contract_value_final',
                    'completion_date_planned',
                    'commencement_date',
                    'effective_date',
                    'administration_notes',
                    'administration_initialized_by_user_id',
                    'administration_initialized_at',
                    'administration_status',
                ];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        if ($col === 'administration_initialized_by_user_id') {
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
