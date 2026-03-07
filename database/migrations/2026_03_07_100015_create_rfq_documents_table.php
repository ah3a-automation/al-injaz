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
        Schema::create('rfq_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->string('document_type', 30)->default('other');
            $table->string('source_type', 20)->default('upload');
            $table->string('title', 200);
            $table->string('file_path', 500)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->string('external_provider', 30)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE rfq_documents ADD CONSTRAINT chk_rfd_document_type CHECK (document_type IN ('boq','drawings','specifications','other'))");
        DB::statement("ALTER TABLE rfq_documents ADD CONSTRAINT chk_rfd_source_type CHECK (source_type IN ('upload','google_drive','wetransfer','dropbox','onedrive'))");
        DB::statement("ALTER TABLE rfq_documents ADD CONSTRAINT chk_rfd_provider CHECK (external_provider IN ('google_drive','wetransfer','dropbox','onedrive') OR external_provider IS NULL)");
        DB::statement('CREATE INDEX idx_rfd_rfq ON rfq_documents (rfq_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_documents');
    }
};
