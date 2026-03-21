<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contract_article_versions')) {
            return;
        }

        Schema::table('contract_article_versions', function (Blueprint $table): void {
            if (! Schema::hasColumn('contract_article_versions', 'risk_tags')) {
                $table->json('risk_tags')->nullable()->after('change_summary');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('contract_article_versions')) {
            return;
        }

        Schema::table('contract_article_versions', function (Blueprint $table): void {
            if (Schema::hasColumn('contract_article_versions', 'risk_tags')) {
                $table->dropColumn('risk_tags');
            }
        });
    }
};
