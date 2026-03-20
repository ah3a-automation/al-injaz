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
        Schema::create('contract_articles', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('code', 100);
            $table->integer('serial');
            $table->string('category', 20);
            $table->string('status', 20)->default('draft');
            $table->uuid('current_version_id')->nullable();
            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique('code');
        });

        Schema::create('contract_article_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_article_id')->constrained('contract_articles')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->string('title_ar', 500);
            $table->string('title_en', 500);
            $table->text('content_ar');
            $table->text('content_en');
            $table->text('change_summary')->nullable();
            $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampsTz();

            $table->unique(
                ['contract_article_id', 'version_number'],
                'uq_contract_article_versions_article_version'
            );
        });

        // Add FK from contract_articles.current_version_id to contract_article_versions.id
        DB::statement(
            'ALTER TABLE contract_articles
             ADD CONSTRAINT contract_articles_current_version_id_foreign
             FOREIGN KEY (current_version_id)
             REFERENCES contract_article_versions(id)
             ON DELETE SET NULL'
        );

        // Data integrity constraints for category and status
        DB::statement("
            ALTER TABLE contract_articles
            ADD CONSTRAINT chk_contract_articles_category
            CHECK (category IN ('mandatory','recommended','optional'))
        ");

        DB::statement("
            ALTER TABLE contract_articles
            ADD CONSTRAINT chk_contract_articles_status
            CHECK (status IN ('draft','active','archived'))
        ");

        // Performance indexes for common filters/sorting
        DB::statement('CREATE INDEX idx_contract_articles_category ON contract_articles (category)');
        DB::statement('CREATE INDEX idx_contract_articles_status ON contract_articles (status)');
        DB::statement('CREATE INDEX idx_contract_articles_serial ON contract_articles (serial)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_article_versions');
        Schema::dropIfExists('contract_articles');
    }
};

