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
        if (Schema::hasTable('rfq_supplier_quote_snapshots')) {
            return;
        }

        if (! Schema::hasTable('rfq_supplier_quotes')) {
            return;
        }

        Schema::create('rfq_supplier_quote_snapshots', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_supplier_quote_id')->constrained('rfq_supplier_quotes')->cascadeOnDelete();
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->unsignedInteger('revision_no');
            $table->jsonb('snapshot_data');
            $table->timestampTz('submitted_at');
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['rfq_supplier_quote_id', 'revision_no'], 'uq_rfsqs_tracker_revision');
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfsqs_snap_rfq_supplier ON rfq_supplier_quote_snapshots (rfq_id, supplier_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_supplier_quote_snapshots');
    }
};
