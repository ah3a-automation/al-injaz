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
        if (Schema::hasTable('contract_draft_articles') && Schema::hasTable('users')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_articles', 'negotiation_status')) {
                    $table->string('negotiation_status', 30)->default('not_reviewed')->after('is_modified');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'negotiation_notes')) {
                    $table->text('negotiation_notes')->nullable()->after('negotiation_status');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'legal_notes')) {
                    $table->text('legal_notes')->nullable()->after('negotiation_notes');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'commercial_notes')) {
                    $table->text('commercial_notes')->nullable()->after('legal_notes');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'internal_notes')) {
                    $table->text('internal_notes')->nullable()->after('commercial_notes');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'has_deviation')) {
                    $table->boolean('has_deviation')->default(false)->after('internal_notes');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'requires_special_approval')) {
                    $table->boolean('requires_special_approval')->default(false)->after('has_deviation');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'negotiation_updated_by_user_id')) {
                    $table->foreignId('negotiation_updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('contract_draft_articles', 'negotiation_updated_at')) {
                    $table->timestampTz('negotiation_updated_at')->nullable();
                }
            });

            DB::statement('ALTER TABLE contract_draft_articles DROP CONSTRAINT IF EXISTS chk_cd_articles_negotiation_status');
            DB::statement("
                ALTER TABLE contract_draft_articles
                ADD CONSTRAINT chk_cd_articles_negotiation_status
                CHECK (negotiation_status IN ('not_reviewed','in_negotiation','agreed','deviation_flagged','ready_for_review'))
            ");
        }

        if (Schema::hasTable('contract_draft_articles') && Schema::hasTable('users')) {
            Schema::create('contract_draft_article_negotiations', function (Blueprint $table): void {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('contract_draft_article_id')->constrained('contract_draft_articles')->cascadeOnDelete();
                $table->string('negotiation_status', 30);
                $table->text('negotiation_notes')->nullable();
                $table->text('legal_notes')->nullable();
                $table->text('commercial_notes')->nullable();
                $table->text('internal_notes')->nullable();
                $table->boolean('has_deviation');
                $table->boolean('requires_special_approval');
                $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
                $table->timestampsTz();
            });

            DB::statement("
                ALTER TABLE contract_draft_article_negotiations
                ADD CONSTRAINT chk_cd_article_negot_status
                CHECK (negotiation_status IN ('not_reviewed','in_negotiation','agreed','deviation_flagged','ready_for_review'))
            ");
            DB::statement('CREATE INDEX idx_cd_article_negot_article ON contract_draft_article_negotiations (contract_draft_article_id)');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_draft_article_negotiations')) {
            Schema::dropIfExists('contract_draft_article_negotiations');
        }

        if (! Schema::hasTable('contract_draft_articles')) {
            return;
        }

        Schema::table('contract_draft_articles', function (Blueprint $table): void {
            if (Schema::hasColumn('contract_draft_articles', 'negotiation_updated_by_user_id')) {
                $table->dropForeign(['negotiation_updated_by_user_id']);
                $table->dropColumn('negotiation_updated_by_user_id');
            }
            foreach ([
                'negotiation_status',
                'negotiation_notes',
                'legal_notes',
                'commercial_notes',
                'internal_notes',
                'has_deviation',
                'requires_special_approval',
                'negotiation_updated_at',
            ] as $column) {
                if (Schema::hasColumn('contract_draft_articles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        DB::statement('ALTER TABLE contract_draft_articles DROP CONSTRAINT IF EXISTS chk_cd_articles_negotiation_status');
    }
};

