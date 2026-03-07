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
        Schema::create('rfq_awards', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->restrictOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->foreignUuid('quote_id')->constrained('supplier_quotes')->restrictOnDelete();
            $table->decimal('awarded_amount', 18, 2);
            $table->string('currency', 3)->default('SAR');
            $table->text('award_note')->nullable();
            $table->unsignedBigInteger('awarded_by');
            $table->foreign('awarded_by')->references('id')->on('users')->restrictOnDelete();
            $table->timestampTz('awarded_at')->useCurrent();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE rfq_awards ADD CONSTRAINT chk_ra_awarded_amount CHECK (awarded_amount > 0)");
        DB::statement('CREATE UNIQUE INDEX uq_ra_rfq ON rfq_awards (rfq_id)');
        DB::statement('CREATE INDEX idx_ra_supplier ON rfq_awards (supplier_id)');
        DB::statement('CREATE INDEX idx_ra_quote ON rfq_awards (quote_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_awards');
    }
};
