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
        if (! Schema::hasTable('contract_draft_articles') || ! Schema::hasTable('users')) {
            return;
        }

        Schema::create('contract_draft_article_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_draft_article_id')->constrained('contract_draft_articles')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->text('title_en');
            $table->text('title_ar');
            $table->text('content_en');
            $table->text('content_ar');
            $table->text('change_summary')->nullable();
            $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampsTz();

            $table->unique(['contract_draft_article_id', 'version_number'], 'uq_cd_article_versions_article_version');
        });

        DB::statement('CREATE INDEX idx_cd_article_versions_article ON contract_draft_article_versions (contract_draft_article_id)');
        DB::statement('CREATE INDEX idx_cd_article_versions_article_number ON contract_draft_article_versions (contract_draft_article_id, version_number)');
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_draft_article_versions')) {
            Schema::dropIfExists('contract_draft_article_versions');
        }
    }
};

