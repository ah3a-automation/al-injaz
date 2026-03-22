<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('contract_article_versions')) {
            Schema::table('contract_article_versions', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_article_versions', 'blocks')) {
                    $table->jsonb('blocks')->nullable()->after('risk_tags');
                }
            });
        }

        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_articles', 'blocks')) {
                    $table->jsonb('blocks')->nullable()->after('content_en');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_article_versions')) {
            Schema::table('contract_article_versions', function (Blueprint $table): void {
                if (Schema::hasColumn('contract_article_versions', 'blocks')) {
                    $table->dropColumn('blocks');
                }
            });
        }

        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (Schema::hasColumn('contract_draft_articles', 'blocks')) {
                    $table->dropColumn('blocks');
                }
            });
        }
    }
};
