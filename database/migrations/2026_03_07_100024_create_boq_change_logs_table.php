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
        Schema::create('boq_change_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('boq_version_id')->constrained('boq_versions')->cascadeOnDelete();
            $table->string('item_code', 100);
            $table->string('change_type', 20);
            $table->decimal('old_cost', 18, 2)->nullable();
            $table->decimal('new_cost', 18, 2)->nullable();
            $table->decimal('cost_impact', 18, 2)->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE boq_change_logs ADD CONSTRAINT chk_bcl_change_type CHECK (change_type IN ('added','removed','modified'))");
        DB::statement('CREATE INDEX idx_bcl_version ON boq_change_logs (boq_version_id)');
        DB::statement('CREATE INDEX idx_bcl_change_type ON boq_change_logs (change_type)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_bcl_version');
        DB::statement('DROP INDEX IF EXISTS idx_bcl_change_type');
        Schema::dropIfExists('boq_change_logs');
    }
};
