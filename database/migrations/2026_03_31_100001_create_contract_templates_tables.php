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
        Schema::create('contract_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('code', 100);
            $table->string('name_en', 255);
            $table->string('name_ar', 255);
            $table->string('template_type', 50);
            $table->string('status', 20)->default('draft');
            $table->text('description')->nullable();
            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique('code');
        });

        Schema::create('contract_template_items', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_template_id')->constrained('contract_templates')->cascadeOnDelete();
            $table->foreignUuid('contract_article_id')->constrained('contract_articles')->cascadeOnDelete();
            $table->unsignedInteger('sort_order');
            $table->timestampsTz();

            $table->unique(
                ['contract_template_id', 'contract_article_id'],
                'uq_contract_template_items_template_article'
            );
        });

        // Data integrity constraints for template_type and status
        DB::statement("
            ALTER TABLE contract_templates
            ADD CONSTRAINT chk_contract_templates_type
            CHECK (template_type IN ('supply','supply_install','subcontract','service','consultancy'))
        ");

        DB::statement("
            ALTER TABLE contract_templates
            ADD CONSTRAINT chk_contract_templates_status
            CHECK (status IN ('draft','active','archived'))
        ");

        // Performance indexes for common filters/sorting
        DB::statement('CREATE INDEX idx_contract_templates_type ON contract_templates (template_type)');
        DB::statement('CREATE INDEX idx_contract_templates_status ON contract_templates (status)');

        DB::statement('CREATE INDEX idx_contract_template_items_template_order ON contract_template_items (contract_template_id, sort_order)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_template_items');
        Schema::dropIfExists('contract_templates');
    }
};

