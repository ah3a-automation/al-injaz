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
        Schema::create('rfq_quote_items', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_quote_id')->constrained('rfq_quotes')->cascadeOnDelete();
            $table->foreignUuid('rfq_item_id')->constrained('rfq_items')->cascadeOnDelete();
            $table->decimal('unit_price', 18, 4)->default(0);
            $table->decimal('total_price', 18, 4)->default(0);
            $table->string('currency', 3)->default('SAR');
            $table->text('notes')->nullable();
            $table->timestampsTz();
        });

        DB::statement('CREATE INDEX idx_rfq_quote_items_quote ON rfq_quote_items (rfq_quote_id)');
        DB::statement('CREATE INDEX idx_rfq_quote_items_item ON rfq_quote_items (rfq_item_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_quote_items');
    }
};
