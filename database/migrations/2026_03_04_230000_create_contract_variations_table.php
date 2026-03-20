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
        if (Schema::hasTable('contract_variations') || ! Schema::hasTable('contracts')) {
            return;
        }

        Schema::create('contract_variations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->unsignedInteger('variation_no');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('variation_type', 50);
            $table->decimal('amount_delta', 14, 2)->default(0);
            $table->integer('time_delta_days')->default(0);
            $table->string('status', 50)->default('draft');
            $table->unsignedBigInteger('requested_by');
            $table->foreign('requested_by')->references('id')->on('users')->restrictOnDelete();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented'))");
        DB::statement("ALTER TABLE contract_variations ADD CONSTRAINT chk_cv_variation_type CHECK (variation_type IN ('addition', 'deduction', 'time_extension', 'scope_change'))");
        DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_contract ON contract_variations (contract_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_variation_no ON contract_variations (contract_id, variation_no)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_cv_status ON contract_variations (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_variations');
    }
};
