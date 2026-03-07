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
        Schema::create('rfqs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignUuid('purchase_request_id')->nullable()->constrained('purchase_requests')->nullOnDelete();
            $table->string('rfq_number', 50)->unique();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('draft');
            $table->unsignedInteger('version_no')->default(1);
            $table->text('addendum_note')->nullable();
            $table->date('submission_deadline')->nullable();
            $table->integer('validity_period_days')->nullable();
            $table->string('currency', 3)->default('SAR');
            $table->boolean('require_acceptance')->default(true);
            $table->unsignedBigInteger('created_by');
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->unsignedBigInteger('issued_by')->nullable();
            $table->foreign('issued_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('issued_at')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement("ALTER TABLE rfqs ADD CONSTRAINT chk_rfq_status CHECK (status IN ('draft','issued','supplier_submissions','evaluation','awarded','closed'))");
        DB::statement('CREATE INDEX idx_rfq_project ON rfqs (project_id) WHERE project_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_rfq_pr ON rfqs (purchase_request_id) WHERE purchase_request_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_rfq_status ON rfqs (status)');
        DB::statement('CREATE INDEX idx_rfq_deadline ON rfqs (submission_deadline) WHERE submission_deadline IS NOT NULL');

        DB::statement('ALTER TABLE purchase_requests ADD CONSTRAINT fk_pr_converted_rfq FOREIGN KEY (converted_to_rfq_id) REFERENCES rfqs(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS fk_pr_converted_rfq');
        Schema::dropIfExists('rfqs');
    }
};
