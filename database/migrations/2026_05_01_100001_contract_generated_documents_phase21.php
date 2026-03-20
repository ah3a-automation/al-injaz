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
        Schema::create('contract_generated_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignUuid('contract_issue_package_id')->nullable()->constrained('contract_issue_packages')->nullOnDelete();
            $table->string('document_type', 40);
            $table->string('file_name', 255);
            $table->string('file_path', 1000);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('generation_source', 30);
            $table->string('snapshot_contract_status', 50)->nullable();
            $table->unsignedInteger('snapshot_issue_version')->nullable();
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('generated_at')->useCurrent();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable()->useCurrent();
        });

        DB::statement("ALTER TABLE contract_generated_documents ADD CONSTRAINT chk_contract_generated_documents_type CHECK (document_type IN ('contract_docx','contract_pdf','signature_package_docx','signature_package_pdf'))");
        DB::statement("ALTER TABLE contract_generated_documents ADD CONSTRAINT chk_contract_generated_documents_source CHECK (generation_source IN ('draft','signature_package'))");
        DB::statement('CREATE INDEX idx_contract_generated_documents_contract_id ON contract_generated_documents (contract_id)');
        DB::statement('CREATE INDEX idx_contract_generated_documents_issue_package_id ON contract_generated_documents (contract_issue_package_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_generated_documents');
    }
};
