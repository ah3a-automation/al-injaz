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
        if (Schema::hasTable('rfq_supplier_invitations') || ! Schema::hasTable('rfqs') || ! Schema::hasTable('suppliers')) {
            return;
        }

        Schema::create('rfq_supplier_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->timestampTz('invited_at')->useCurrent();
            $table->timestampTz('viewed_at')->nullable();
            $table->timestampTz('acknowledged_at')->nullable();
            $table->timestampTz('responded_at')->nullable();
            $table->string('status', 20)->default('invited');
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE rfq_supplier_invitations ADD CONSTRAINT chk_rfq_si_status CHECK (status IN ('invited','viewed','acknowledged','responded','declined'))");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_si_rfq_supplier ON rfq_supplier_invitations (rfq_id, supplier_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_si_rfq ON rfq_supplier_invitations (rfq_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_si_supplier ON rfq_supplier_invitations (supplier_id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE rfq_supplier_invitations DROP CONSTRAINT IF EXISTS chk_rfq_si_status');
        Schema::dropIfExists('rfq_supplier_invitations');
    }
};
