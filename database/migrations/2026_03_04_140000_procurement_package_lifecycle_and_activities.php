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
        if (! Schema::hasTable('procurement_packages')) {
            return;
        }

        // Backfill legacy status values to new lifecycle
        DB::table('procurement_packages')->where('status', 'rfq_created')->update(['status' => 'rfq_in_progress']);
        DB::table('procurement_packages')->where('status', 'contracted')->update(['status' => 'awarded']);

        // Expand package status lifecycle: drop old constraint, add new allowed values
        DB::statement('ALTER TABLE procurement_packages DROP CONSTRAINT IF EXISTS chk_proc_pkg_status');
        DB::statement("ALTER TABLE procurement_packages ADD CONSTRAINT chk_proc_pkg_status CHECK (status IN (
            'draft',
            'under_review',
            'approved_for_rfq',
            'rfq_in_progress',
            'evaluation',
            'awarded',
            'closed',
            'cancelled'
        ))");

        if (! Schema::hasTable('package_activities')) {
            Schema::create('package_activities', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->foreignUuid('package_id')->constrained('procurement_packages')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('activity_type', 64);
                $table->text('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_package ON package_activities (package_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_created ON package_activities (created_at)');
    }

    public function down(): void
    {
        if (Schema::hasTable('package_activities')) {
            Schema::drop('package_activities');
        }

        // Revert to legacy status values where applicable
        if (Schema::hasTable('procurement_packages')) {
            DB::table('procurement_packages')->where('status', 'rfq_in_progress')->update(['status' => 'rfq_created']);
            DB::statement('ALTER TABLE procurement_packages DROP CONSTRAINT IF EXISTS chk_proc_pkg_status');
            DB::statement("ALTER TABLE procurement_packages ADD CONSTRAINT chk_proc_pkg_status CHECK (status IN ('draft','rfq_created','awarded','contracted','closed'))");
        }
    }
};
