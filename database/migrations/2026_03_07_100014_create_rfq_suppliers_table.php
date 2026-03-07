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
        Schema::create('rfq_suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('status', 20)->default('invited');
            $table->timestampTz('invited_at')->useCurrent();
            $table->timestampTz('responded_at')->nullable();
            $table->text('decline_reason')->nullable();
            $table->unsignedBigInteger('invited_by')->nullable();
            $table->foreign('invited_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable();
        });

        DB::statement("ALTER TABLE rfq_suppliers ADD CONSTRAINT chk_rfs_status CHECK (status IN ('invited','accepted','declined','submitted'))");
        DB::statement('CREATE UNIQUE INDEX uq_rfs_rfq_supplier ON rfq_suppliers (rfq_id, supplier_id)');
        DB::statement('CREATE INDEX idx_rfs_rfq ON rfq_suppliers (rfq_id)');
        DB::statement('CREATE INDEX idx_rfs_supplier ON rfq_suppliers (supplier_id)');
        DB::statement("CREATE INDEX idx_rfs_pending ON rfq_suppliers (rfq_id) WHERE status = 'invited'");
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_suppliers');
    }
};
