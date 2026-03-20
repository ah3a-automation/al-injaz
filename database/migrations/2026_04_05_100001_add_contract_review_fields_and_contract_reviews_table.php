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
                if (! Schema::hasColumn('contracts', 'submitted_for_review_at')) {
                    $table->timestampTz('submitted_for_review_at')
                        ->nullable()
                        ->after('status');
                }

                if (! Schema::hasColumn('contracts', 'submitted_for_review_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('submitted_for_review_by_user_id')
                        ->nullable()
                        ->after('submitted_for_review_at')
                        ->constrained('users')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'review_completed_at')) {
                    $table->timestampTz('review_completed_at')
                        ->nullable()
                        ->after('submitted_for_review_by_user_id');
                }

                if (! Schema::hasColumn('contracts', 'review_completed_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('review_completed_by_user_id')
                        ->nullable()
                        ->after('review_completed_at')
                        ->constrained('users')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'review_return_reason')) {
                    $table->text('review_return_reason')
                        ->nullable()
                        ->after('review_completed_by_user_id');
                }

                if (! Schema::hasColumn('contracts', 'approval_summary')) {
                    $table->text('approval_summary')
                        ->nullable()
                        ->after('review_return_reason');
                }
            });

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
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_reviews')) {
            Schema::create('contract_reviews', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('review_stage', 20);
                $table->string('decision', 30);
                $table->string('from_status', 50);
                $table->string('to_status', 50);
                $table->text('review_notes')->nullable();
                $table->foreignId('decision_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_reviews
                ADD CONSTRAINT chk_contract_reviews_stage
                CHECK (review_stage IN ('legal','commercial','management'))
            ");

            DB::statement("
                ALTER TABLE contract_reviews
                ADD CONSTRAINT chk_contract_reviews_decision
                CHECK (decision IN ('approved','rejected','returned_for_rework'))
            ");

            DB::statement('CREATE INDEX idx_contract_reviews_contract_created_at ON contract_reviews (contract_id, created_at DESC)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_reviews')) {
            Schema::dropIfExists('contract_reviews');
        }

        // Review-related columns on contracts are left in place to avoid destructive rollback in production.
    }
};

