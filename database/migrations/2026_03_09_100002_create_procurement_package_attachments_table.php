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
        Schema::create('procurement_package_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('package_id')->constrained('procurement_packages')->cascadeOnDelete();
            $table->string('source_type', 20)->default('upload');
            $table->string('title', 200);
            $table->string('file_path', 500)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->string('external_provider', 30)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable();
        });

        DB::statement("ALTER TABLE procurement_package_attachments ADD CONSTRAINT chk_ppa_source_type CHECK (source_type IN ('upload','google_drive','dropbox','onedrive','wetransfer','other_link'))");
        DB::statement('CREATE INDEX idx_ppa_package ON procurement_package_attachments (package_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_package_attachments');
    }
};
