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
        if (Schema::hasTable('rfq_evaluations') || ! Schema::hasTable('rfqs') || ! Schema::hasTable('suppliers')) {
            return;
        }

        Schema::create('rfq_evaluations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('price_score', 10, 2)->default(0);
            $table->decimal('technical_score', 10, 2)->default(0);
            $table->decimal('commercial_score', 10, 2)->default(0);
            $table->decimal('total_score', 10, 2)->default(0);
            $table->text('comments')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_rfq ON rfq_evaluations (rfq_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_supplier ON rfq_evaluations (supplier_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_ev_evaluator ON rfq_evaluations (evaluator_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_evaluations');
    }
};
