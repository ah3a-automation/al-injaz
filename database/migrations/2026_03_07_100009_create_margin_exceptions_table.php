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
        Schema::create('margin_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->restrictOnDelete();
            $table->string('scope_type', 30);
            $table->string('scope_id', 64);
            $table->string('trigger_context', 50);
            $table->decimal('revenue_at_time', 18, 2);
            $table->decimal('committed_cost_at_time', 18, 2);
            $table->decimal('proposed_cost', 18, 2);
            $table->decimal('projected_total_cost', 18, 2);
            $table->decimal('projected_margin_pct', 8, 4)->nullable();
            $table->string('reason_code', 50);
            $table->text('reason_text');
            $table->unsignedBigInteger('requested_by');
            $table->foreign('requested_by')->references('id')->on('users')->restrictOnDelete();
            $table->timestampTz('requested_at')->useCurrent();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('ceo_decision_note')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE margin_exceptions ADD CONSTRAINT chk_me_status CHECK (status IN ('pending','approved','rejected'))");
        DB::statement("ALTER TABLE margin_exceptions ADD CONSTRAINT chk_me_scope_type CHECK (scope_type IN ('project','package','boq_item'))");
        DB::statement("ALTER TABLE margin_exceptions ADD CONSTRAINT chk_me_trigger CHECK (trigger_context IN ('rfq_award','contract_create','vo','manual'))");
        DB::statement("ALTER TABLE margin_exceptions ADD CONSTRAINT chk_me_reason_code CHECK (reason_code IN ('cost_loaded_to_other','pricing_error','strategic','other'))");
        DB::statement('CREATE INDEX idx_me_project ON margin_exceptions (project_id)');
        DB::statement('CREATE INDEX idx_me_status ON margin_exceptions (status)');
        DB::statement('CREATE INDEX idx_me_requested_by ON margin_exceptions (requested_by)');
        DB::statement("CREATE INDEX idx_me_pending ON margin_exceptions (project_id) WHERE status = 'pending'");
        DB::statement('CREATE INDEX idx_me_scope ON margin_exceptions (scope_type, scope_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('margin_exceptions');
    }
};
