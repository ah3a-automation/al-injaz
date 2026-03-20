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
                if (! Schema::hasColumn('contracts', 'finalized_for_signature_at')) {
                    $table->timestampTz('finalized_for_signature_at')
                        ->nullable()
                        ->after('approval_summary');
                }

                if (! Schema::hasColumn('contracts', 'finalized_for_signature_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('finalized_for_signature_by_user_id')
                        ->nullable()
                        ->after('finalized_for_signature_at')
                        ->constrained('users')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'current_issue_package_id')) {
                    $table->uuid('current_issue_package_id')
                        ->nullable()
                        ->after('finalized_for_signature_by_user_id');
                }

                if (! Schema::hasColumn('contracts', 'is_locked_for_signature')) {
                    $table->boolean('is_locked_for_signature')
                        ->default(false)
                        ->after('current_issue_package_id');
                }
            });
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_issue_packages')) {
            Schema::create('contract_issue_packages', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->unsignedInteger('issue_version');
                $table->string('package_status', 20);
                $table->foreignId('prepared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('prepared_at');
                $table->text('notes')->nullable();
                $table->string('snapshot_contract_status', 50);
                $table->string('snapshot_contract_title_en', 255)->nullable();
                $table->string('snapshot_contract_title_ar', 255)->nullable();
                $table->string('snapshot_supplier_name', 255)->nullable();
                $table->string('snapshot_contract_number', 255);
                $table->unsignedInteger('snapshot_article_count');
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_issue_packages
                ADD CONSTRAINT chk_contract_issue_packages_status
                CHECK (package_status IN ('issued','superseded'))
            ");

            DB::statement("
                ALTER TABLE contract_issue_packages
                ADD CONSTRAINT uq_contract_issue_packages_version
                UNIQUE (contract_id, issue_version)
            ");

            DB::statement('CREATE INDEX idx_contract_issue_packages_contract ON contract_issue_packages (contract_id)');
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('contract_issue_packages')) {
            DB::statement("
                ALTER TABLE contracts
                ADD CONSTRAINT fk_contracts_current_issue_package
                FOREIGN KEY (current_issue_package_id)
                REFERENCES contract_issue_packages(id)
                ON DELETE SET NULL
            ");
        }

        DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_status');
        DB::statement("
            ALTER TABLE contracts
            ADD CONSTRAINT chk_contracts_status
            CHECK (
                status IN (
                    'draft',
                    'under_preparation',
                    'ready_for_review',
                    'in_legal_review',
                    'in_commercial_review',
                    'in_management_review',
                    'returned_for_rework',
                    'approved_for_signature',
                    'signature_package_issued',
                    'pending_signature',
                    'active',
                    'completed',
                    'terminated',
                    'cancelled'
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_status');
        DB::statement("
            ALTER TABLE contracts
            ADD CONSTRAINT chk_contracts_status
            CHECK (
                status IN (
                    'draft',
                    'under_preparation',
                    'ready_for_review',
                    'in_legal_review',
                    'in_commercial_review',
                    'in_management_review',
                    'returned_for_rework',
                    'approved_for_signature',
                    'pending_signature',
                    'active',
                    'completed',
                    'terminated',
                    'cancelled'
                )
            )
        ");

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                if (Schema::hasColumn('contracts', 'is_locked_for_signature')) {
                    $table->dropColumn('is_locked_for_signature');
                }

                if (Schema::hasColumn('contracts', 'current_issue_package_id')) {
                    $table->dropColumn('current_issue_package_id');
                }

                if (Schema::hasColumn('contracts', 'finalized_for_signature_by_user_id')) {
                    $table->dropConstrainedForeignId('finalized_for_signature_by_user_id');
                }

                if (Schema::hasColumn('contracts', 'finalized_for_signature_at')) {
                    $table->dropColumn('finalized_for_signature_at');
                }
            });
        }

        if (Schema::hasTable('contract_issue_packages')) {
            Schema::dropIfExists('contract_issue_packages');
        }
    }
};

