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
        Schema::create('supplier_watchlists', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement('ALTER TABLE supplier_watchlists ADD CONSTRAINT uq_supplier_watchlist_user_supplier UNIQUE (user_id, supplier_id)');
        DB::statement('CREATE INDEX idx_supplier_watchlist_user ON supplier_watchlists (user_id)');
        DB::statement('CREATE INDEX idx_supplier_watchlist_supplier ON supplier_watchlists (supplier_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_watchlists');
    }
};
