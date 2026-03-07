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
        Schema::create('rfq_quotes', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->timestampTz('submitted_at')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE rfq_quotes ADD CONSTRAINT chk_rfq_quote_status CHECK (status IN ('draft','submitted','revised'))");
        DB::statement('CREATE INDEX idx_rfq_quotes_rfq ON rfq_quotes (rfq_id)');
        DB::statement('CREATE INDEX idx_rfq_quotes_supplier ON rfq_quotes (supplier_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_quotes');
    }
};
