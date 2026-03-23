<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rfq_quotes')) {
            Schema::table('rfq_quotes', function (Blueprint $table): void {
                if (! Schema::hasColumn('rfq_quotes', 'draft_saved_at')) {
                    $table->timestampTz('draft_saved_at')->nullable()->after('submitted_at');
                }
                if (! Schema::hasColumn('rfq_quotes', 'draft_data')) {
                    $table->json('draft_data')->nullable()->after('draft_saved_at');
                }
            });
        }

        if (Schema::hasTable('rfq_quote_items')) {
            Schema::table('rfq_quote_items', function (Blueprint $table): void {
                if (! Schema::hasColumn('rfq_quote_items', 'included_in_other')) {
                    $table->boolean('included_in_other')->default(false)->after('notes');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('rfq_quote_items')) {
            Schema::table('rfq_quote_items', function (Blueprint $table): void {
                if (Schema::hasColumn('rfq_quote_items', 'included_in_other')) {
                    $table->dropColumn('included_in_other');
                }
            });
        }

        if (Schema::hasTable('rfq_quotes')) {
            Schema::table('rfq_quotes', function (Blueprint $table): void {
                if (Schema::hasColumn('rfq_quotes', 'draft_data')) {
                    $table->dropColumn('draft_data');
                }
                if (Schema::hasColumn('rfq_quotes', 'draft_saved_at')) {
                    $table->dropColumn('draft_saved_at');
                }
            });
        }
    }
};
