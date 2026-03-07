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
        Schema::create('rfq_clarifications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->text('question');
            $table->text('answer')->nullable();
            $table->string('visibility', 20)->default('private_supplier');
            $table->unsignedBigInteger('asked_by')->nullable();
            $table->foreign('asked_by')->references('id')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('answered_by')->nullable();
            $table->foreign('answered_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('answered_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_visibility CHECK (visibility IN ('private_supplier','broadcast_all'))");
        DB::statement('CREATE INDEX idx_rfc_rfq ON rfq_clarifications (rfq_id)');
        DB::statement('CREATE INDEX idx_rfc_supplier ON rfq_clarifications (supplier_id) WHERE supplier_id IS NOT NULL');
        DB::statement("CREATE INDEX idx_rfc_unanswered ON rfq_clarifications (rfq_id) WHERE answer IS NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_clarifications');
    }
};
