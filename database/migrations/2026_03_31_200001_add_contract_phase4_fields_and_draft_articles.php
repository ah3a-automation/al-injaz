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
                if (! Schema::hasColumn('contracts', 'title_en')) {
                    $table->string('title_en', 255)->nullable()->after('contract_number');
                }

                if (! Schema::hasColumn('contracts', 'title_ar')) {
                    $table->string('title_ar', 255)->nullable()->after('title_en');
                }

                if (! Schema::hasColumn('contracts', 'source_type')) {
                    $table->string('source_type', 20)->default('rfq_award')->after('status');
                }

                if (! Schema::hasColumn('contracts', 'project_id') && Schema::hasTable('projects')) {
                    $table->foreignUuid('project_id')->nullable()->after('rfq_id')->constrained('projects')->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'procurement_package_id') && Schema::hasTable('procurement_packages')) {
                    $table->foreignUuid('procurement_package_id')->nullable()->after('project_id')->constrained('procurement_packages')->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'contract_template_id') && Schema::hasTable('contract_templates')) {
                    $table->foreignUuid('contract_template_id')->nullable()->after('supplier_id')->constrained('contract_templates')->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'commercial_total')) {
                    $table->decimal('commercial_total', 18, 2)->nullable()->after('contract_value');
                }

                if (! Schema::hasColumn('contracts', 'start_date')) {
                    $table->timestampTz('start_date')->nullable()->after('signed_at');
                }

                if (! Schema::hasColumn('contracts', 'end_date')) {
                    $table->timestampTz('end_date')->nullable()->after('start_date');
                }

                if (! Schema::hasColumn('contracts', 'description')) {
                    $table->text('description')->nullable()->after('end_date');
                }

                if (! Schema::hasColumn('contracts', 'internal_notes')) {
                    $table->text('internal_notes')->nullable()->after('description');
                }

                if (! Schema::hasColumn('contracts', 'updated_by_user_id') && Schema::hasTable('users')) {
                    $table->foreignId('updated_by_user_id')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
                }

                if (! Schema::hasColumn('contracts', 'updated_at')) {
                    $table->timestampTz('updated_at')->nullable()->after('created_at');
                }
            });

            // Extend status constraint to include draft lifecycle + existing lifecycle statuses
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_status');
            DB::statement("
                ALTER TABLE contracts
                ADD CONSTRAINT chk_contracts_status
                CHECK (
                    status IN (
                        'draft',
                        'pending_signature',
                        'active',
                        'completed',
                        'terminated',
                        'under_preparation',
                        'ready_for_review',
                        'cancelled'
                    )
                )
            ");

            // Source type constraint
            DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_source_type');
            DB::statement("
                ALTER TABLE contracts
                ADD CONSTRAINT chk_contracts_source_type
                CHECK (source_type IN ('rfq_award','manual'))
            ");

            // Optional indexes for new foreign keys
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts (project_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_procurement_package ON contracts (procurement_package_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_template ON contracts (contract_template_id)');
        }

        if (Schema::hasTable('contracts')) {
            Schema::create('contract_draft_articles', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
                $table->unsignedInteger('sort_order');
                $table->foreignUuid('source_contract_article_id')->nullable()->constrained('contract_articles')->nullOnDelete();
                $table->foreignUuid('source_contract_article_version_id')->nullable()->constrained('contract_article_versions')->nullOnDelete();
                $table->foreignUuid('source_template_id')->nullable()->constrained('contract_templates')->nullOnDelete();
                $table->foreignUuid('source_template_item_id')->nullable()->constrained('contract_template_items')->nullOnDelete();
                $table->string('article_code', 100);
                $table->string('title_ar', 500);
                $table->string('title_en', 500);
                $table->text('content_ar');
                $table->text('content_en');
                $table->string('origin_type', 20)->default('library');
                $table->boolean('is_modified')->default(false);
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->nullable();
            });

            DB::statement("
                ALTER TABLE contract_draft_articles
                ADD CONSTRAINT chk_cd_articles_origin_type
                CHECK (origin_type IN ('template','library','manual'))
            ");

            DB::statement('CREATE INDEX idx_cd_articles_contract_order ON contract_draft_articles (contract_id, sort_order)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_draft_articles')) {
            Schema::dropIfExists('contract_draft_articles');
        }

        // Columns added to contracts are left in place to avoid destructive rollback in production.
    }
};

