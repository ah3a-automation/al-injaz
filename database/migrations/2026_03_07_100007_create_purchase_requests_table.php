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
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->restrictOnDelete();
            $table->foreignUuid('package_id')->nullable()->constrained('project_packages')->nullOnDelete();
            $table->string('pr_number', 50)->unique();
            $table->string('title_ar', 300)->nullable();
            $table->string('title_en', 300);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('draft');
            $table->string('priority', 20)->default('normal');
            $table->unsignedBigInteger('requested_by');
            $table->foreign('requested_by')->references('id')->on('users')->restrictOnDelete();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->date('needed_by_date')->nullable();
            $table->uuid('converted_to_rfq_id')->nullable();
            $table->string('erp_reference_id', 100)->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement("ALTER TABLE purchase_requests ADD CONSTRAINT chk_pr_status CHECK (status IN ('draft','submitted','approved','rejected','converted','closed'))");
        DB::statement("ALTER TABLE purchase_requests ADD CONSTRAINT chk_pr_priority CHECK (priority IN ('low','normal','high','urgent'))");
        DB::statement('CREATE INDEX idx_pr_project ON purchase_requests (project_id)');
        DB::statement('CREATE INDEX idx_pr_status ON purchase_requests (status)');
        DB::statement('CREATE INDEX idx_pr_requested_by ON purchase_requests (requested_by)');
        DB::statement('CREATE INDEX idx_pr_package ON purchase_requests (package_id) WHERE package_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_pr_number ON purchase_requests (pr_number)');
        DB::statement('CREATE INDEX idx_pr_needed_by ON purchase_requests (needed_by_date) WHERE needed_by_date IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_requests');
    }
};
