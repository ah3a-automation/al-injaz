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
        Schema::table('procurement_package_attachments', function (Blueprint $table): void {
            $table->string('document_type', 30)->nullable()->after('package_id');
        });

        DB::statement("ALTER TABLE procurement_package_attachments ADD CONSTRAINT chk_ppa_document_type CHECK (document_type IS NULL OR document_type IN ('specifications','drawings','boq','other'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE procurement_package_attachments DROP CONSTRAINT IF EXISTS chk_ppa_document_type');
        Schema::table('procurement_package_attachments', function (Blueprint $table): void {
            $table->dropColumn('document_type');
        });
    }
};
