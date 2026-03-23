<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Latest submitted snapshot (denormalized); immutable history is in rfq_supplier_quote_snapshots.
     */
    public function up(): void
    {
        if (! Schema::hasTable('rfq_supplier_quotes')) {
            return;
        }

        Schema::table('rfq_supplier_quotes', function (Blueprint $table): void {
            if (! Schema::hasColumn('rfq_supplier_quotes', 'snapshot_data')) {
                $table->json('snapshot_data')->nullable()->after('currency');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfq_supplier_quotes')) {
            return;
        }

        Schema::table('rfq_supplier_quotes', function (Blueprint $table): void {
            if (Schema::hasColumn('rfq_supplier_quotes', 'snapshot_data')) {
                $table->dropColumn('snapshot_data');
            }
        });
    }
};
