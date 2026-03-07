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
        Schema::create('supplier_quote_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('quote_id')->constrained('supplier_quotes')->cascadeOnDelete();
            $table->foreignUuid('rfq_item_id')->constrained('rfq_items')->cascadeOnDelete();
            $table->decimal('unit_price', 18, 4)->default(0.00);
            $table->decimal('qty', 15, 4)->nullable();
            $table->decimal('total_price', 18, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE supplier_quote_items ADD CONSTRAINT chk_sqi_unit_price CHECK (unit_price >= 0)");
        DB::statement("ALTER TABLE supplier_quote_items ADD CONSTRAINT chk_sqi_total_price CHECK (total_price >= 0)");
        DB::statement('CREATE UNIQUE INDEX uq_sqi_quote_item ON supplier_quote_items (quote_id, rfq_item_id)');
        DB::statement('CREATE INDEX idx_sqi_quote ON supplier_quote_items (quote_id)');
        DB::statement('CREATE INDEX idx_sqi_rfq_item ON supplier_quote_items (rfq_item_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_quote_items');
    }
};
