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
                if (! Schema::hasColumn('contracts', 'executed_at')) {
                    $table->timestampTz('executed_at')
                        ->nullable()
                        ->after('is_locked_for_signature');
                }
                if (! Schema::hasColumn('contracts', 'executed_by_user_id')) {
                    $table->foreignId('executed_by_user_id')
                        ->nullable()
                        ->after('executed_at')
                        ->constrained('users')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_signatories')) {
            Schema::create('contract_signatories', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('signatory_type', 20);
                $table->string('name');
                $table->string('email')->nullable();
                $table->string('title')->nullable();
                $table->unsignedInteger('sign_order');
                $table->boolean('is_required')->default(true);
                $table->string('status', 20);
                $table->timestampTz('signed_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_signatories
                ADD CONSTRAINT chk_contract_signatories_type
                CHECK (signatory_type IN ('internal','supplier'))
            ");
            DB::statement("
                ALTER TABLE contract_signatories
                ADD CONSTRAINT chk_contract_signatories_status
                CHECK (status IN ('pending','signed','declined','skipped'))
            ");
            DB::statement('CREATE INDEX idx_contract_signatories_contract ON contract_signatories (contract_id)');
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_signature_events')) {
            Schema::create('contract_signature_events', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->foreignUuid('contract_signatory_id')->nullable()->constrained('contract_signatories')->nullOnDelete();
                $table->string('event_type', 30);
                $table->text('event_notes')->nullable();
                $table->string('old_status', 50)->nullable();
                $table->string('new_status', 50)->nullable();
                $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_signature_events
                ADD CONSTRAINT chk_contract_signature_events_type
                CHECK (event_type IN (
                    'signatory_added',
                    'signatory_updated',
                    'marked_signed',
                    'marked_declined',
                    'marked_skipped',
                    'contract_executed'
                ))
            ");
            DB::statement('CREATE INDEX idx_contract_signature_events_contract ON contract_signature_events (contract_id)');
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
                    'awaiting_internal_signature',
                    'awaiting_supplier_signature',
                    'partially_signed',
                    'fully_signed',
                    'executed',
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
                    'signature_package_issued',
                    'pending_signature',
                    'active',
                    'completed',
                    'terminated',
                    'cancelled'
                )
            )
        ");

        if (Schema::hasTable('contract_signature_events')) {
            Schema::dropIfExists('contract_signature_events');
        }
        if (Schema::hasTable('contract_signatories')) {
            Schema::dropIfExists('contract_signatories');
        }

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                if (Schema::hasColumn('contracts', 'executed_by_user_id')) {
                    $table->dropConstrainedForeignId('executed_by_user_id');
                }
                if (Schema::hasColumn('contracts', 'executed_at')) {
                    $table->dropColumn('executed_at');
                }
            });
        }
    }
};
