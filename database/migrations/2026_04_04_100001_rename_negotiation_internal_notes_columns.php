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
        // contract_draft_articles
        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_articles', 'negotiation_internal_notes')) {
                    $table->text('negotiation_internal_notes')->nullable()->after('commercial_notes');
                }
            });

            if (Schema::hasColumn('contract_draft_articles', 'internal_notes')) {
                DB::statement('UPDATE contract_draft_articles SET negotiation_internal_notes = internal_notes WHERE internal_notes IS NOT NULL');

                Schema::table('contract_draft_articles', function (Blueprint $table): void {
                    $table->dropColumn('internal_notes');
                });
            }
        }

        // contract_draft_article_negotiations
        if (Schema::hasTable('contract_draft_article_negotiations')) {
            Schema::table('contract_draft_article_negotiations', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_article_negotiations', 'negotiation_internal_notes')) {
                    $table->text('negotiation_internal_notes')->nullable()->after('commercial_notes');
                }
            });

            if (Schema::hasColumn('contract_draft_article_negotiations', 'internal_notes')) {
                DB::statement('UPDATE contract_draft_article_negotiations SET negotiation_internal_notes = internal_notes WHERE internal_notes IS NOT NULL');

                Schema::table('contract_draft_article_negotiations', function (Blueprint $table): void {
                    $table->dropColumn('internal_notes');
                });
            }
        }
    }

    public function down(): void
    {
        // contract_draft_articles
        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_articles', 'internal_notes')) {
                    $table->text('internal_notes')->nullable()->after('commercial_notes');
                }
            });

            if (Schema::hasColumn('contract_draft_articles', 'negotiation_internal_notes')) {
                DB::statement('UPDATE contract_draft_articles SET internal_notes = negotiation_internal_notes WHERE negotiation_internal_notes IS NOT NULL');

                Schema::table('contract_draft_articles', function (Blueprint $table): void {
                    $table->dropColumn('negotiation_internal_notes');
                });
            }
        }

        // contract_draft_article_negotiations
        if (Schema::hasTable('contract_draft_article_negotiations')) {
            Schema::table('contract_draft_article_negotiations', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_article_negotiations', 'internal_notes')) {
                    $table->text('internal_notes')->nullable()->after('commercial_notes');
                }
            });

            if (Schema::hasColumn('contract_draft_article_negotiations', 'negotiation_internal_notes')) {
                DB::statement('UPDATE contract_draft_article_negotiations SET internal_notes = negotiation_internal_notes WHERE negotiation_internal_notes IS NOT NULL');

                Schema::table('contract_draft_article_negotiations', function (Blueprint $table): void {
                    $table->dropColumn('negotiation_internal_notes');
                });
            }
        }
    }
};

