<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contract_invoices')) {
            return;
        }

        Schema::table('contract_invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('contract_invoices', 'metadata')) {
                $table->jsonb('metadata')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_invoices') && Schema::hasColumn('contract_invoices', 'metadata')) {
            Schema::table('contract_invoices', function (Blueprint $table) {
                $table->dropColumn('metadata');
            });
        }
    }
};
