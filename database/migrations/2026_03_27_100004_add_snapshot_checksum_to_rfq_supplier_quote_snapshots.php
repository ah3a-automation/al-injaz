<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rfq_supplier_quote_snapshots')) {
            return;
        }

        if (Schema::hasColumn('rfq_supplier_quote_snapshots', 'snapshot_checksum')) {
            return;
        }

        Schema::table('rfq_supplier_quote_snapshots', function (Blueprint $table): void {
            $table->string('snapshot_checksum', 64)->nullable()->after('snapshot_data');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfq_supplier_quote_snapshots')) {
            return;
        }

        if (! Schema::hasColumn('rfq_supplier_quote_snapshots', 'snapshot_checksum')) {
            return;
        }

        Schema::table('rfq_supplier_quote_snapshots', function (Blueprint $table): void {
            $table->dropColumn('snapshot_checksum');
        });
    }
};
