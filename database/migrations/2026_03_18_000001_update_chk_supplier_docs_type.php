<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('supplier_documents')) {
            return;
        }

        // Keep DB integrity in sync with `App\Models\SupplierDocument` constants.
        DB::statement("ALTER TABLE supplier_documents DROP CONSTRAINT IF EXISTS chk_supplier_docs_type");

        DB::statement(
            "ALTER TABLE supplier_documents ADD CONSTRAINT chk_supplier_docs_type CHECK (" .
                "document_type IN (" .
                "'commercial_registration'," .
                "'unified_number'," .
                "'vat_certificate'," .
                "'business_license'," .
                "'national_address'," .
                "'bank_letter'," .
                "'company_profile'," .
                "'iso_certificate'," .
                "'credit_application'," .
                "'other'" .
                ")" .
            ")"
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('supplier_documents')) {
            return;
        }

        // Rollback to the previous constraint list (pre-credit_application).
        DB::statement("ALTER TABLE supplier_documents DROP CONSTRAINT IF EXISTS chk_supplier_docs_type");

        DB::statement(
            "ALTER TABLE supplier_documents ADD CONSTRAINT chk_supplier_docs_type CHECK (" .
                "document_type IN (" .
                "'commercial_registration'," .
                "'unified_number'," .
                "'vat_certificate'," .
                "'business_license'," .
                "'national_address'," .
                "'bank_letter'," .
                "'company_profile'," .
                "'iso_certificate'," .
                "'other'" .
                ")" .
            ")"
        );
    }
};

