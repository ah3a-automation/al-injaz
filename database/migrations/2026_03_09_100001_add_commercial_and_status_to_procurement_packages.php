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
        Schema::table('procurement_packages', function (Blueprint $table) {
            $table->string('package_no', 80)->nullable()->after('project_id');
            $table->string('currency', 3)->default('SAR')->after('description');
            $table->date('needed_by_date')->nullable()->after('currency');
            $table->decimal('estimated_revenue', 18, 2)->default(0.00)->after('needed_by_date');
            $table->decimal('actual_cost', 18, 2)->default(0.00)->after('estimated_cost');
            $table->string('status', 30)->default('draft')->after('actual_cost');
        });

        DB::statement("ALTER TABLE procurement_packages ADD CONSTRAINT chk_proc_pkg_status CHECK (status IN ('draft','rfq_created','awarded','contracted','closed'))");

        DB::statement('CREATE UNIQUE INDEX uq_proc_pkg_package_no ON procurement_packages (package_no) WHERE package_no IS NOT NULL');
        DB::statement('CREATE INDEX idx_proc_pkg_package_no ON procurement_packages (package_no)');
        DB::statement('CREATE INDEX idx_proc_pkg_status ON procurement_packages (status)');
        DB::statement('CREATE INDEX idx_proc_pkg_needed_by ON procurement_packages (needed_by_date) WHERE needed_by_date IS NOT NULL');

        $this->backfillPackageNumbers();
    }

    private function backfillPackageNumbers(): void
    {
        $packages = DB::table('procurement_packages')
            ->select('id', 'project_id')
            ->whereNull('package_no')
            ->orderBy('created_at')
            ->get();

        $projectSequences = [];
        foreach ($packages as $pkg) {
            $projectId = $pkg->project_id;
            if (! isset($projectSequences[$projectId])) {
                $project = DB::table('projects')->where('id', $projectId)->first(['id', 'code']);
                $prefix = $project && ! empty($project->code)
                    ? (string) $project->code
                    : 'PKG-' . substr($projectId, 0, 8);
                $projectSequences[$projectId] = ['prefix' => $prefix, 'next' => 1];
            }
            $seq = $projectSequences[$projectId]['next']++;
            $prefix = $projectSequences[$projectId]['prefix'];
            $packageNo = $prefix . '-PKG-' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
            DB::table('procurement_packages')->where('id', $pkg->id)->update(['package_no' => $packageNo]);
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_proc_pkg_needed_by');
        DB::statement('DROP INDEX IF EXISTS idx_proc_pkg_status');
        DB::statement('DROP INDEX IF EXISTS idx_proc_pkg_package_no');
        DB::statement('DROP INDEX IF EXISTS uq_proc_pkg_package_no');
        DB::statement('ALTER TABLE procurement_packages DROP CONSTRAINT IF EXISTS chk_proc_pkg_status');
        Schema::table('procurement_packages', function (Blueprint $table) {
            $table->dropColumn(['package_no', 'currency', 'needed_by_date', 'estimated_revenue', 'actual_cost', 'status']);
        });
    }
};
