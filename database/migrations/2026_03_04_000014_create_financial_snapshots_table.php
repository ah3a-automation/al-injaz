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
        Schema::create('financial_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->decimal('total_budget', 18, 2)->default(0);
            $table->decimal('allocated_budget', 18, 2)->default(0);
            $table->decimal('spent_amount', 18, 2)->default(0);
            $table->decimal('remaining_budget', 18, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->json('breakdown')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->unique(['project_id', 'snapshot_date'], 'uq_fs_project_date');
        });

        DB::statement('ALTER TABLE financial_snapshots ALTER COLUMN id SET DEFAULT gen_random_uuid()');
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_snapshots');
    }
};
