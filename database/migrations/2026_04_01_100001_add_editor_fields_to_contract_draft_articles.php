<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contract_draft_articles') || ! Schema::hasTable('users')) {
            return;
        }

        Schema::table('contract_draft_articles', function (Blueprint $table): void {
            if (! Schema::hasColumn('contract_draft_articles', 'updated_by_user_id')) {
                $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('contract_draft_articles', 'last_edited_at')) {
                $table->timestampTz('last_edited_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('contract_draft_articles')) {
            return;
        }

        Schema::table('contract_draft_articles', function (Blueprint $table): void {
            if (Schema::hasColumn('contract_draft_articles', 'updated_by_user_id')) {
                $table->dropForeign(['updated_by_user_id']);
                $table->dropColumn('updated_by_user_id');
            }

            if (Schema::hasColumn('contract_draft_articles', 'last_edited_at')) {
                $table->dropColumn('last_edited_at');
            }
        });
    }
};

