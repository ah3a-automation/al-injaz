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
        Schema::create('contract_variable_overrides', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('variable_key', 255);
            $table->text('value_text')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable()->useCurrent();
        });

        DB::statement('CREATE UNIQUE INDEX uq_contract_variable_overrides_contract_key ON contract_variable_overrides (contract_id, variable_key)');
        DB::statement('CREATE INDEX idx_contract_variable_overrides_contract_id ON contract_variable_overrides (contract_id)');

        if (Schema::hasTable('contract_articles')) {
            Schema::table('contract_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_articles', 'variable_keys')) {
                    $table->json('variable_keys')->nullable()->after('internal_notes');
                }
            });
        }

        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                if (! Schema::hasColumn('contract_draft_articles', 'source_template_content_en')) {
                    $table->text('source_template_content_en')->nullable()->after('content_en');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'source_template_content_ar')) {
                    $table->text('source_template_content_ar')->nullable()->after('source_template_content_en');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'rendered_content_en')) {
                    $table->text('rendered_content_en')->nullable()->after('source_template_content_ar');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'rendered_content_ar')) {
                    $table->text('rendered_content_ar')->nullable()->after('rendered_content_en');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'used_variable_keys')) {
                    $table->json('used_variable_keys')->nullable()->after('rendered_content_ar');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'unresolved_variable_keys')) {
                    $table->json('unresolved_variable_keys')->nullable()->after('used_variable_keys');
                }
                if (! Schema::hasColumn('contract_draft_articles', 'last_rendered_at')) {
                    $table->timestampTz('last_rendered_at')->nullable()->after('unresolved_variable_keys');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_draft_articles')) {
            Schema::table('contract_draft_articles', function (Blueprint $table): void {
                $table->dropColumn([
                    'source_template_content_en',
                    'source_template_content_ar',
                    'rendered_content_en',
                    'rendered_content_ar',
                    'used_variable_keys',
                    'unresolved_variable_keys',
                    'last_rendered_at',
                ]);
            });
        }

        if (Schema::hasTable('contract_articles')) {
            Schema::table('contract_articles', function (Blueprint $table): void {
                $table->dropColumn('variable_keys');
            });
        }

        Schema::dropIfExists('contract_variable_overrides');
    }
};
