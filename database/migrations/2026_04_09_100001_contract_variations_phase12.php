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
                if (! Schema::hasColumn('contracts', 'variation_total_approved')) {
                    $table->decimal('variation_total_approved', 18, 2)->nullable()->default(0)->after('supplier_reference_no');
                }
                if (! Schema::hasColumn('contracts', 'variation_days_total_approved')) {
                    $table->integer('variation_days_total_approved')->nullable()->default(0)->after('variation_total_approved');
                }
                if (! Schema::hasColumn('contracts', 'variation_count_total')) {
                    $table->integer('variation_count_total')->nullable()->default(0)->after('variation_days_total_approved');
                }
                if (! Schema::hasColumn('contracts', 'variation_count_approved')) {
                    $table->integer('variation_count_approved')->nullable()->default(0)->after('variation_count_total');
                }
            });
        }

        if (! Schema::hasTable('contract_variations') || ! Schema::hasTable('contracts')) {
            return;
        }

        Schema::table('contract_variations', function (Blueprint $table): void {
            if (! Schema::hasColumn('contract_variations', 'reason')) {
                $table->text('reason')->nullable()->after('description');
            }
            if (! Schema::hasColumn('contract_variations', 'commercial_delta')) {
                $table->decimal('commercial_delta', 18, 2)->nullable()->after('reason');
            }
            if (! Schema::hasColumn('contract_variations', 'currency')) {
                $table->string('currency', 10)->nullable()->after('commercial_delta');
            }
            if (! Schema::hasColumn('contract_variations', 'submitted_at')) {
                $table->timestampTz('submitted_at')->nullable()->after('time_delta_days');
            }
            if (! Schema::hasColumn('contract_variations', 'submitted_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('submitted_by_user_id')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_variations', 'approved_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('approved_by_user_id')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_variations', 'rejected_at')) {
                $table->timestampTz('rejected_at')->nullable()->after('approved_by_user_id');
            }
            if (! Schema::hasColumn('contract_variations', 'rejected_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('rejected_by_user_id')->nullable()->after('rejected_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_variations', 'decision_notes')) {
                $table->text('decision_notes')->nullable()->after('rejected_by_user_id');
            }
            if (! Schema::hasColumn('contract_variations', 'created_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('created_by_user_id')->nullable()->after('decision_notes')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_variations', 'updated_by_user_id') && Schema::hasTable('users')) {
                $table->foreignId('updated_by_user_id')->nullable()->after('created_by_user_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('contract_variations', 'updated_at')) {
                $table->timestampTz('updated_at')->nullable()->after('created_at');
            }
        });

        // 1) Drop check constraints before any data changes so legacy values can be updated
        DB::statement('ALTER TABLE contract_variations DROP CONSTRAINT IF EXISTS chk_cv_status');
        DB::statement('ALTER TABLE contract_variations DROP CONSTRAINT IF EXISTS chk_cv_variation_type');

        // 2) Backfill / normalize data
        DB::statement('UPDATE contract_variations SET commercial_delta = amount_delta WHERE commercial_delta IS NULL AND amount_delta IS NOT NULL');
        DB::statement('UPDATE contract_variations SET created_by_user_id = requested_by WHERE created_by_user_id IS NULL AND requested_by IS NOT NULL');
        if (Schema::hasColumn('contract_variations', 'approved_by')) {
            DB::statement('UPDATE contract_variations SET approved_by_user_id = approved_by WHERE approved_by_user_id IS NULL AND approved_by IS NOT NULL');
        }

        if (Schema::hasColumn('contract_variations', 'variation_no')) {
            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'pgsql') {
                $columnType = DB::selectOne("
                    SELECT data_type FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'contract_variations' AND column_name = 'variation_no'
                ");
                $isInteger = $columnType && in_array($columnType->data_type ?? '', ['integer', 'bigint', 'smallint'], true);
                if ($isInteger) {
                    DB::statement("ALTER TABLE contract_variations ADD COLUMN IF NOT EXISTS variation_no_str VARCHAR(100)");
                    DB::statement("UPDATE contract_variations SET variation_no_str = 'VO-' || LPAD(variation_no::text, 3, '0') WHERE variation_no_str IS NULL");
                    DB::statement('ALTER TABLE contract_variations DROP COLUMN variation_no');
                    DB::statement('ALTER TABLE contract_variations RENAME COLUMN variation_no_str TO variation_no');
                }
            }
        }

        DB::statement("UPDATE contract_variations SET variation_type = 'commercial' WHERE variation_type IN ('addition','deduction')");
        DB::statement("UPDATE contract_variations SET variation_type = 'time' WHERE variation_type = 'time_extension'");
        DB::statement("UPDATE contract_variations SET variation_type = 'administrative' WHERE variation_type = 'scope_change'");
        DB::statement("UPDATE contract_variations SET status = 'approved' WHERE status = 'implemented'");

        // 3) Add Phase 12 check constraints only after data is normalized
        DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_variation_type CHECK (variation_type IN ('commercial','time','commercial_time','administrative'))");
        DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_status CHECK (status IN ('draft','submitted','approved','rejected'))");

        // 4) Recreate unique index after data is normalized
        try {
            DB::statement('DROP INDEX IF EXISTS idx_cv_variation_no');
        } catch (\Throwable $e) {
        }
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_variations_contract_no ON contract_variations (contract_id, variation_no)');
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_variations')) {
            DB::statement('DROP INDEX IF EXISTS uq_contract_variations_contract_no');
            DB::statement('ALTER TABLE contract_variations DROP CONSTRAINT IF EXISTS chk_cv_status');
            DB::statement('ALTER TABLE contract_variations DROP CONSTRAINT IF EXISTS chk_cv_variation_type');
            DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented'))");
            DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_variation_type CHECK (variation_type IN ('addition', 'deduction', 'time_extension', 'scope_change'))");

            Schema::table('contract_variations', function (Blueprint $table): void {
                $cols = ['updated_by_user_id', 'created_by_user_id', 'decision_notes', 'rejected_by_user_id', 'rejected_at', 'approved_by_user_id', 'submitted_by_user_id', 'submitted_at', 'currency', 'commercial_delta', 'reason'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('contract_variations', $col)) {
                        if (in_array($col, ['submitted_by_user_id', 'rejected_by_user_id', 'approved_by_user_id', 'created_by_user_id', 'updated_by_user_id'], true)) {
                            $table->dropConstrainedForeignId($col);
                        } else {
                            $table->dropColumn($col);
                        }
                    }
                }
                if (Schema::hasColumn('contract_variations', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
            });
        }

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table): void {
                foreach (['variation_count_approved', 'variation_count_total', 'variation_days_total_approved', 'variation_total_approved'] as $col) {
                    if (Schema::hasColumn('contracts', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
