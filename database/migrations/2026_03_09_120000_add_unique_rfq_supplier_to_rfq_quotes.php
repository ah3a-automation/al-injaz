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
        if (! Schema::hasTable('rfq_quotes')) {
            return;
        }

        // Remove duplicate (rfq_id, supplier_id) rows, keeping the newest quote per pair (portable across drivers).
        $groups = DB::table('rfq_quotes')
            ->select('rfq_id', 'supplier_id')
            ->groupBy('rfq_id', 'supplier_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $row) {
            $ids = DB::table('rfq_quotes')
                ->where('rfq_id', $row->rfq_id)
                ->where('supplier_id', $row->supplier_id)
                ->orderByDesc('submitted_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->pluck('id');

            if ($ids->count() <= 1) {
                continue;
            }

            $keep = $ids->first();
            $toDelete = $ids->slice(1)->values()->all();
            if ($toDelete !== []) {
                DB::table('rfq_quotes')->whereIn('id', $toDelete)->delete();
            }
        }

        Schema::table('rfq_quotes', function (Blueprint $table): void {
            $table->unique(['rfq_id', 'supplier_id'], 'rfq_quotes_rfq_supplier_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfq_quotes')) {
            return;
        }

        Schema::table('rfq_quotes', function (Blueprint $table): void {
            $table->dropUnique('rfq_quotes_rfq_supplier_unique');
        });
    }
};
