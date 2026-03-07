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
        Schema::create('boq_import_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('status', 30)->default('pending');
            $table->unsignedInteger('progress')->default(0);
            $table->unsignedInteger('rows_total')->default(0);
            $table->unsignedInteger('rows_processed')->default(0);
            $table->string('file_path', 500)->nullable();
            $table->string('error_file_path', 500)->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE boq_import_jobs ADD CONSTRAINT chk_bij_status CHECK (status IN ('pending','running','completed','failed'))");
        DB::statement('CREATE INDEX idx_bij_project ON boq_import_jobs (project_id)');
        DB::statement('CREATE INDEX idx_bij_status ON boq_import_jobs (status)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_bij_project');
        DB::statement('DROP INDEX IF EXISTS idx_bij_status');
        Schema::dropIfExists('boq_import_jobs');
    }
};
