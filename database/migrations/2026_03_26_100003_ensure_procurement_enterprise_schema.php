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
        $this->ensureProcurementPackageLifecycle();
        $this->ensureRfqLifecycle();
        $this->ensureClarificationWorkflow();
        $this->ensureRfqSupportingTables();
        $this->ensureContractsLifecycle();
    }

    public function down(): void
    {
        // No destructive rollback: this migration only reconciles schema drift
        // caused by historical out-of-order migration timestamps.
    }

    private function ensureProcurementPackageLifecycle(): void
    {
        if (! Schema::hasTable('procurement_packages')) {
            return;
        }

        DB::table('procurement_packages')->where('status', 'rfq_created')->update(['status' => 'rfq_in_progress']);
        DB::table('procurement_packages')->where('status', 'contracted')->update(['status' => 'awarded']);

        DB::statement('ALTER TABLE procurement_packages DROP CONSTRAINT IF EXISTS chk_proc_pkg_status');
        DB::statement("ALTER TABLE procurement_packages ADD CONSTRAINT chk_proc_pkg_status CHECK (status IN (
            'draft',
            'under_review',
            'approved_for_rfq',
            'rfq_in_progress',
            'evaluation',
            'awarded',
            'closed',
            'cancelled'
        ))");

        Schema::table('procurement_packages', function (Blueprint $table): void {
            if (! Schema::hasColumn('procurement_packages', 'readiness_score')) {
                $table->unsignedInteger('readiness_score')->default(0);
            }
            if (! Schema::hasColumn('procurement_packages', 'readiness_cached_at')) {
                $table->timestampTz('readiness_cached_at')->nullable();
            }
        });

        if (! Schema::hasTable('package_activities') && Schema::hasTable('users')) {
            Schema::create('package_activities', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('package_id')->constrained('procurement_packages')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('actor_type', 191)->nullable();
                $table->string('actor_id', 64)->nullable();
                $table->string('activity_type', 64);
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (Schema::hasTable('package_activities')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_package ON package_activities (package_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_created ON package_activities (created_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_actor ON package_activities (actor_type, actor_id)');
        }
    }

    private function ensureRfqLifecycle(): void
    {
        if (! Schema::hasTable('rfqs')) {
            return;
        }

        DB::table('rfqs')->where('status', 'supplier_submissions')->update(['status' => 'responses_received']);
        DB::table('rfqs')->where('status', 'evaluation')->update(['status' => 'under_evaluation']);
        DB::table('rfqs')->where('status', 'sent')->update(['status' => 'issued']);

        DB::statement('ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS chk_rfq_status');
        DB::statement("ALTER TABLE rfqs ADD CONSTRAINT chk_rfq_status CHECK (status IN (
            'draft',
            'internally_approved',
            'issued',
            'supplier_questions_open',
            'responses_received',
            'under_evaluation',
            'recommended',
            'awarded',
            'closed',
            'cancelled'
        ))");

        if (! Schema::hasTable('rfq_activities') && Schema::hasTable('users')) {
            Schema::create('rfq_activities', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('actor_type', 191)->nullable();
                $table->string('actor_id', 64)->nullable();
                $table->string('activity_type', 64);
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (Schema::hasTable('rfq_activities')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_rfq ON rfq_activities (rfq_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_created ON rfq_activities (created_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_actor ON rfq_activities (actor_type, actor_id)');
        }
    }

    private function ensureClarificationWorkflow(): void
    {
        if (! Schema::hasTable('rfq_clarifications')) {
            return;
        }

        Schema::table('rfq_clarifications', function (Blueprint $table): void {
            if (! Schema::hasColumn('rfq_clarifications', 'status')) {
                $table->string('status', 20)->default('open');
            }
            if (! Schema::hasColumn('rfq_clarifications', 'actor_type')) {
                $table->string('actor_type', 191)->nullable();
            }
            if (! Schema::hasColumn('rfq_clarifications', 'actor_id')) {
                $table->string('actor_id', 64)->nullable();
            }
            if (! Schema::hasColumn('rfq_clarifications', 'due_at')) {
                $table->timestampTz('due_at')->nullable();
            }
        });

        DB::table('rfq_clarifications')->where('visibility', 'private_supplier')->update(['visibility' => 'private']);
        DB::table('rfq_clarifications')->where('visibility', 'broadcast_all')->update(['visibility' => 'public']);
        DB::statement('ALTER TABLE rfq_clarifications DROP CONSTRAINT IF EXISTS chk_rfc_visibility');
        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_visibility CHECK (visibility IN ('public','private'))");

        DB::table('rfq_clarifications')->whereNull('answer')->update(['status' => 'open']);
        DB::table('rfq_clarifications')->whereNotNull('answer')->update(['status' => 'answered']);
        DB::statement('ALTER TABLE rfq_clarifications DROP CONSTRAINT IF EXISTS chk_rfc_status');
        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_status CHECK (status IN ('open','answered','closed','reopened'))");
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfc_status ON rfq_clarifications (status)');
    }

    private function ensureRfqSupportingTables(): void
    {
        if (Schema::hasTable('rfqs') && Schema::hasTable('suppliers')) {
            if (! Schema::hasTable('rfq_supplier_invitations')) {
                Schema::create('rfq_supplier_invitations', function (Blueprint $table): void {
                    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                    $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
                    $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
                    $table->timestampTz('invited_at')->useCurrent();
                    $table->timestampTz('viewed_at')->nullable();
                    $table->timestampTz('acknowledged_at')->nullable();
                    $table->timestampTz('responded_at')->nullable();
                    $table->string('status', 20)->default('invited');
                    $table->timestampTz('created_at')->useCurrent();
                });
                DB::statement("ALTER TABLE rfq_supplier_invitations ADD CONSTRAINT chk_rfq_si_status CHECK (status IN ('invited','viewed','acknowledged','responded','declined'))");
            }

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_si_rfq_supplier ON rfq_supplier_invitations (rfq_id, supplier_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_si_rfq ON rfq_supplier_invitations (rfq_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_si_supplier ON rfq_supplier_invitations (supplier_id)');

            if (! Schema::hasTable('rfq_supplier_quotes')) {
                Schema::create('rfq_supplier_quotes', function (Blueprint $table): void {
                    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                    $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
                    $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
                    $table->timestampTz('submitted_at')->nullable();
                    $table->unsignedInteger('revision_no')->default(1);
                    $table->string('status', 20)->default('draft');
                    $table->decimal('total_amount', 18, 2)->nullable();
                    $table->string('currency', 10)->default('SAR');
                    $table->timestampTz('created_at')->useCurrent();
                });
                DB::statement("ALTER TABLE rfq_supplier_quotes ADD CONSTRAINT chk_rfsq_status CHECK (status IN ('draft','submitted','revised','accepted','rejected'))");
            }

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_rfsq_rfq_supplier ON rfq_supplier_quotes (rfq_id, supplier_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfsq_rfq ON rfq_supplier_quotes (rfq_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfsq_supplier ON rfq_supplier_quotes (supplier_id)');
        }

        if (Schema::hasTable('rfqs') && Schema::hasTable('suppliers') && Schema::hasTable('users') && ! Schema::hasTable('rfq_evaluations')) {
            Schema::create('rfq_evaluations', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
                $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
                $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
                $table->decimal('price_score', 10, 2)->default(0);
                $table->decimal('technical_score', 10, 2)->default(0);
                $table->decimal('commercial_score', 10, 2)->default(0);
                $table->decimal('total_score', 10, 2)->default(0);
                $table->text('comments')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_rfq ON rfq_evaluations (rfq_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_supplier ON rfq_evaluations (supplier_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_evaluator ON rfq_evaluations (evaluator_id)');
        }

        if (Schema::hasTable('rfq_awards')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ra_awarded_by ON rfq_awards (awarded_by)');
        }

        if (Schema::hasTable('rfq_suppliers')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_supplier_status ON rfq_suppliers (supplier_id, status)');
        }
        if (Schema::hasTable('rfq_quotes')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_quotes_supplier_status ON rfq_quotes (supplier_id, status)');
        }
        if (Schema::hasTable('supplier_documents')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_supplier_docs_supplier_expiry ON supplier_documents (supplier_id, expiry_date)');
        }
        if (Schema::hasTable('supplier_certification_assignments')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_sup_cert_assign_supplier_expires ON supplier_certification_assignments (supplier_id, expires_at)');
        }
    }

    private function ensureContractsLifecycle(): void
    {
        if (
            ! Schema::hasTable('contracts')
            && Schema::hasTable('rfqs')
            && Schema::hasTable('suppliers')
            && Schema::hasTable('procurement_packages')
            && Schema::hasTable('users')
        ) {
            Schema::create('contracts', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('rfq_id')->constrained('rfqs')->restrictOnDelete();
                $table->foreignUuid('supplier_id')->constrained('suppliers')->restrictOnDelete();
                $table->foreignUuid('package_id')->nullable()->constrained('procurement_packages')->nullOnDelete();
                $table->string('contract_number', 100);
                $table->decimal('contract_value', 14, 2);
                $table->string('currency', 10)->default('SAR');
                $table->string('status', 50)->default('draft');
                $table->timestampTz('signed_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->timestampTz('created_at')->useCurrent();
            });

            DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_status CHECK (status IN ('draft', 'pending_signature', 'active', 'completed', 'terminated'))");
            DB::statement("ALTER TABLE contracts ADD CONSTRAINT chk_contracts_contract_value CHECK (contract_value >= 0)");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_rfq ON contracts (rfq_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON contracts (supplier_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_package ON contracts (package_id)');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_contract_number ON contracts (contract_number)');
        }

        if (Schema::hasTable('contracts') && ! Schema::hasTable('contract_activities')) {
            Schema::create('contract_activities', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('actor_type', 191)->nullable();
                $table->string('actor_id', 64)->nullable();
                $table->string('activity_type', 100);
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_contract ON contract_activities (contract_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_actor ON contract_activities (actor_type, actor_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_created ON contract_activities (created_at)');
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_variations')) {
            Schema::create('contract_variations', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->unsignedInteger('variation_no');
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->string('variation_type', 50);
                $table->decimal('amount_delta', 14, 2)->default(0);
                $table->integer('time_delta_days')->default(0);
                $table->string('status', 50)->default('draft');
                $table->unsignedBigInteger('requested_by');
                $table->foreign('requested_by')->references('id')->on('users')->restrictOnDelete();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->timestampTz('approved_at')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });

            DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented'))");
            DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_variation_type CHECK (variation_type IN ('addition', 'deduction', 'time_extension', 'scope_change'))");
            DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_contract ON contract_variations (contract_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_variation_no ON contract_variations (contract_id, variation_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_status ON contract_variations (status)');
        }

        if (Schema::hasTable('contracts') && Schema::hasTable('users') && ! Schema::hasTable('contract_invoices')) {
            Schema::create('contract_invoices', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->string('invoice_no', 100);
                $table->date('invoice_date');
                $table->decimal('amount', 14, 2);
                $table->decimal('retention_amount', 14, 2)->default(0);
                $table->decimal('net_amount', 14, 2);
                $table->string('currency', 10);
                $table->string('status', 50)->default('draft');
                $table->unsignedBigInteger('submitted_by')->nullable();
                $table->foreign('submitted_by')->references('id')->on('users')->nullOnDelete();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->timestampTz('approved_at')->nullable();
                $table->timestampTz('paid_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });

            DB::statement("ALTER TABLE contract_invoices ADD CONSTRAINT chk_ci_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid'))");
            DB::statement("ALTER TABLE contract_invoices ADD CONSTRAINT chk_ci_amounts CHECK (amount >= 0 AND retention_amount >= 0 AND net_amount >= 0 AND retention_amount <= amount)");
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_contract ON contract_invoices (contract_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_invoice_no ON contract_invoices (invoice_no)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_ci_status ON contract_invoices (status)');
        }
    }
};
