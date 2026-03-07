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
        Schema::create('procurement_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('package_id')->constrained('procurement_packages')->cascadeOnDelete();
            $table->string('request_no', 50);
            $table->string('status', 20)->default('draft');
            $table->timestampTz('issued_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE procurement_requests ADD CONSTRAINT chk_pr_status CHECK (status IN ('draft','issued','closed'))");
        DB::statement('CREATE UNIQUE INDEX uq_proc_req_request_no ON procurement_requests (request_no)');
        DB::statement('CREATE INDEX idx_proc_req_package ON procurement_requests (package_id)');
        DB::statement('CREATE INDEX idx_proc_req_status ON procurement_requests (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_requests');
    }
};
