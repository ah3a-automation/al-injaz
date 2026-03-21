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
        if (! Schema::hasTable('contract_articles') || ! Schema::hasTable('contract_templates')) {
            return;
        }

        Schema::table('contract_articles', function (Blueprint $table): void {
            $table->string('approval_status', 40)->default('none')->after('internal_notes');
            $table->timestampTz('submitted_at')->nullable()->after('approval_status');
            $table->foreignId('submitted_by_user_id')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            $table->timestampTz('contracts_manager_approved_at')->nullable()->after('submitted_by_user_id');
            $table->foreignId('contracts_manager_approved_by')->nullable()->after('contracts_manager_approved_at')->constrained('users')->nullOnDelete();
            $table->timestampTz('legal_approved_at')->nullable()->after('contracts_manager_approved_by');
            $table->foreignId('legal_approved_by')->nullable()->after('legal_approved_at')->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('legal_approved_by');
        });

        DB::statement("
            ALTER TABLE contract_articles
            ADD CONSTRAINT chk_contract_articles_approval_status
            CHECK (approval_status IN ('none','submitted','contracts_approved','legal_approved','rejected'))
        ");

        DB::statement('CREATE INDEX idx_contract_articles_approval_status ON contract_articles (approval_status)');

        Schema::create('contract_template_versions', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_template_id')->constrained('contract_templates')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->string('name_en', 255);
            $table->string('name_ar', 255);
            $table->text('description')->nullable();
            $table->string('template_type', 50);
            $table->string('status', 20);
            $table->text('internal_notes')->nullable();
            $table->json('article_snapshot');
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('created_at')->useCurrent();

            $table->unique(
                ['contract_template_id', 'version_number'],
                'uq_contract_template_versions_template_version'
            );
        });

        DB::statement('CREATE INDEX idx_contract_template_versions_template ON contract_template_versions (contract_template_id)');

        Schema::table('contract_templates', function (Blueprint $table): void {
            $table->uuid('current_template_version_id')->nullable()->after('internal_notes');
            $table->string('approval_status', 40)->default('none')->after('current_template_version_id');
            $table->timestampTz('submitted_at')->nullable()->after('approval_status');
            $table->foreignId('submitted_by_user_id')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            $table->timestampTz('contracts_manager_approved_at')->nullable()->after('submitted_by_user_id');
            $table->foreignId('contracts_manager_approved_by')->nullable()->after('contracts_manager_approved_at')->constrained('users')->nullOnDelete();
            $table->timestampTz('legal_approved_at')->nullable()->after('contracts_manager_approved_by');
            $table->foreignId('legal_approved_by')->nullable()->after('legal_approved_at')->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('legal_approved_by');
        });

        DB::statement('
            ALTER TABLE contract_templates
            ADD CONSTRAINT contract_templates_current_template_version_id_foreign
            FOREIGN KEY (current_template_version_id)
            REFERENCES contract_template_versions(id)
            ON DELETE SET NULL
        ');

        DB::statement("
            ALTER TABLE contract_templates
            ADD CONSTRAINT chk_contract_templates_approval_status
            CHECK (approval_status IN ('none','submitted','contracts_approved','legal_approved','rejected'))
        ");

        DB::statement('CREATE INDEX idx_contract_templates_approval_status ON contract_templates (approval_status)');
    }

    public function down(): void
    {
        Schema::table('contract_templates', function (Blueprint $table): void {
            $table->dropForeign(['current_template_version_id']);
            $table->dropForeign(['submitted_by_user_id']);
            $table->dropForeign(['contracts_manager_approved_by']);
            $table->dropForeign(['legal_approved_by']);
        });

        DB::statement('ALTER TABLE contract_templates DROP CONSTRAINT IF EXISTS chk_contract_templates_approval_status');
        DB::statement('DROP INDEX IF EXISTS idx_contract_templates_approval_status');

        Schema::table('contract_templates', function (Blueprint $table): void {
            $table->dropColumn([
                'current_template_version_id',
                'approval_status',
                'submitted_at',
                'submitted_by_user_id',
                'contracts_manager_approved_at',
                'contracts_manager_approved_by',
                'legal_approved_at',
                'legal_approved_by',
                'rejection_reason',
            ]);
        });

        Schema::dropIfExists('contract_template_versions');

        Schema::table('contract_articles', function (Blueprint $table): void {
            $table->dropForeign(['submitted_by_user_id']);
            $table->dropForeign(['contracts_manager_approved_by']);
            $table->dropForeign(['legal_approved_by']);
        });

        DB::statement('ALTER TABLE contract_articles DROP CONSTRAINT IF EXISTS chk_contract_articles_approval_status');
        DB::statement('DROP INDEX IF EXISTS idx_contract_articles_approval_status');

        Schema::table('contract_articles', function (Blueprint $table): void {
            $table->dropColumn([
                'approval_status',
                'submitted_at',
                'submitted_by_user_id',
                'contracts_manager_approved_at',
                'contracts_manager_approved_by',
                'legal_approved_at',
                'legal_approved_by',
                'rejection_reason',
            ]);
        });
    }
};
