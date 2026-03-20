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
                if (! Schema::hasColumn('contracts', 'invoice_total_submitted')) {
                    $table->decimal('invoice_total_submitted', 18, 2)->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'invoice_total_approved')) {
                    $table->decimal('invoice_total_approved', 18, 2)->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'invoice_total_paid')) {
                    $table->decimal('invoice_total_paid', 18, 2)->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'invoice_count_total')) {
                    $table->integer('invoice_count_total')->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'invoice_count_approved')) {
                    $table->integer('invoice_count_approved')->nullable()->default(0);
                }
                if (! Schema::hasColumn('contracts', 'invoice_count_paid')) {
                    $table->integer('invoice_count_paid')->nullable()->default(0);
                }
            });
        }

        if (! Schema::hasTable('contract_invoices') || ! Schema::hasTable('contracts')) {
            return;
        }

        Schema::table('contract_invoices', function (Blueprint $table): void {
            if (! Schema::hasColumn('contract_invoices', 'title')) {
                $table->string('title', 255)->nullable()->after('invoice_no');
            }
            if (! Schema::hasColumn('contract_invoices', 'invoice_type')) {
                $table->string('invoice_type', 30)->nullable()->after('title');
            }
            if (! Schema::hasColumn('contract_invoices', 'description')) {
                $table->text('description')->nullable()->after('invoice_type');
            }
            if (! Schema::hasColumn('contract_invoices', 'period_from')) {
                $table->timestampTz('period_from')->nullable()->after('currency');
            }
            if (! Schema::hasColumn('contract_invoices', 'period_to')) {
                $table->timestampTz('period_to')->nullable()->after('period_from');
            }
            if (! Schema::hasColumn('contract_invoices', 'submitted_at')) {
                $table->timestampTz('submitted_at')->nullable()->after('period_to');
            }
            if (! Schema::hasColumn('contract_invoices', 'submitted_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('submitted_by_user_id')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'approved_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('approved_by_user_id')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'rejected_at')) {
                $table->timestampTz('rejected_at')->nullable()->after('approved_by_user_id');
            }
            if (! Schema::hasColumn('contract_invoices', 'rejected_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('rejected_by_user_id')->nullable()->after('rejected_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'paid_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('paid_by_user_id')->nullable()->after('paid_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'decision_notes')) {
                $table->text('decision_notes')->nullable()->after('paid_by_user_id');
            }
            if (! Schema::hasColumn('contract_invoices', 'created_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('created_by_user_id')->nullable()->after('decision_notes')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'updated_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('updated_by_user_id')->nullable()->after('created_by_user_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_invoices', 'updated_at')) {
                $table->timestampTz('updated_at')->nullable()->after('created_at');
            }
        });

        DB::statement("UPDATE contract_invoices SET invoice_type = 'interim' WHERE invoice_type IS NULL");
        DB::statement('UPDATE contract_invoices SET submitted_at = created_at WHERE submitted_at IS NULL AND status IN (\'submitted\', \'approved\', \'paid\') AND submitted_by IS NOT NULL');
        DB::statement('UPDATE contract_invoices SET submitted_by_user_id = submitted_by WHERE submitted_by_user_id IS NULL AND submitted_by IS NOT NULL');
        DB::statement('UPDATE contract_invoices SET approved_by_user_id = approved_by WHERE approved_by_user_id IS NULL AND approved_by IS NOT NULL');
        DB::statement('UPDATE contract_invoices SET title = invoice_no WHERE title IS NULL AND invoice_no IS NOT NULL');

        if (Schema::hasColumn('contract_invoices', 'invoice_type')) {
            DB::statement('ALTER TABLE contract_invoices DROP CONSTRAINT IF EXISTS chk_ci_invoice_type');
            DB::statement("ALTER TABLE contract_invoices ADD CONSTRAINT chk_ci_invoice_type CHECK (invoice_type IS NULL OR invoice_type IN ('advance','interim','final','administrative'))");
        }

        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_invoices_contract_no ON contract_invoices (contract_id, invoice_no)');
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_invoices')) {
            DB::statement('DROP INDEX IF EXISTS uq_contract_invoices_contract_no');
            DB::statement('ALTER TABLE contract_invoices DROP CONSTRAINT IF EXISTS chk_ci_invoice_type');

            Schema::table('contract_invoices', function (Blueprint $table): void {
                $cols = ['updated_by_user_id', 'created_by_user_id', 'decision_notes', 'paid_by_user_id', 'rejected_by_user_id', 'rejected_at', 'approved_by_user_id', 'submitted_by_user_id', 'submitted_at', 'period_to', 'period_from', 'description', 'invoice_type', 'title'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('contract_invoices', $col)) {
                        if (in_array($col, ['submitted_by_user_id', 'approved_by_user_id', 'rejected_by_user_id', 'paid_by_user_id', 'created_by_user_id', 'updated_by_user_id'], true)) {
                            $table->dropConstrainedForeignId($col);
                        } else {
                            $table->dropColumn($col);
                        }
                    }
                }
                if (Schema::hasColumn('contract_invoices', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
            });
        }

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                foreach (['invoice_count_paid', 'invoice_count_approved', 'invoice_count_total', 'invoice_total_paid', 'invoice_total_approved', 'invoice_total_submitted'] as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
