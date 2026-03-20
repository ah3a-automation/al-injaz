<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rfq_suppliers')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_supplier_status ON rfq_suppliers (supplier_id, status)');
        }
        if (Schema::hasTable('rfq_quotes')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_quotes_supplier_status ON rfq_quotes (supplier_id, status)');
        }
        if (Schema::hasTable('rfq_awards')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_awards_supplier ON rfq_awards (supplier_id)');
        }
        if (Schema::hasTable('supplier_documents')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_supplier_docs_supplier_expiry ON supplier_documents (supplier_id, expiry_date)');
        }
        if (Schema::hasTable('supplier_certification_assignments')) {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_sup_cert_assign_supplier_expires ON supplier_certification_assignments (supplier_id, expires_at)');
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_rfq_suppliers_supplier_status');
        DB::statement('DROP INDEX IF EXISTS idx_rfq_quotes_supplier_status');
        DB::statement('DROP INDEX IF EXISTS idx_rfq_awards_supplier');
        DB::statement('DROP INDEX IF EXISTS idx_supplier_docs_supplier_expiry');
        DB::statement('DROP INDEX IF EXISTS idx_sup_cert_assign_supplier_expires');
    }
};
