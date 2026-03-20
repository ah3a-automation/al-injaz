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
        $col = DB::table('information_schema.columns')
            ->select(['data_type', 'udt_name'])
            ->where('table_schema', 'public')
            ->where('table_name', 'supplier_capabilities')
            ->where('column_name', 'category_id')
            ->first();

        if (! $col) {
            return;
        }

        // If already UUID, nothing to do.
        $isUuid = ($col->data_type ?? null) === 'uuid' || ($col->udt_name ?? null) === 'uuid';
        if ($isUuid) {
            return;
        }

        // Add temp UUID column.
        Schema::table('supplier_capabilities', function (Blueprint $table) {
            $table->uuid('category_uuid')->nullable()->after('id');
        });

        // Map legacy integer category_id -> supplier_categories.id.
        // Prefer legacy code mapping if present, otherwise map the known legacy ids (1..5)
        // to their closest enterprise taxonomy roots/branches.
        DB::statement("
            UPDATE supplier_capabilities scp
            SET category_uuid = sc.id
            FROM supplier_categories sc
            WHERE scp.category_id IS NOT NULL
              AND scp.category_uuid IS NULL
              AND (
                sc.code = ('LEGACY-' || scp.category_id::text)
                OR sc.code = CASE scp.category_id
                  WHEN 1 THEN 'CIV'
                  WHEN 2 THEN 'CIV-RBR'
                  WHEN 3 THEN 'ELE'
                  WHEN 4 THEN 'MEP'
                  WHEN 5 THEN 'MEP-HVC'
                  ELSE NULL
                END
              )
        ");

        $unmapped = (int) DB::table('supplier_capabilities')
            ->whereNotNull('category_id')
            ->whereNull('category_uuid')
            ->count();

        if ($unmapped > 0) {
            throw new RuntimeException("Unmapped supplier_capabilities.category_id rows: {$unmapped}. Cannot convert category_id to UUID safely.");
        }

        // Drop FK constraint on old category_id if present.
        $fk = DB::table('information_schema.table_constraints as tc')
            ->join('information_schema.key_column_usage as kcu', function ($join) {
                $join->on('tc.constraint_name', '=', 'kcu.constraint_name')
                    ->on('tc.table_schema', '=', 'kcu.table_schema');
            })
            ->where('tc.table_schema', 'public')
            ->where('tc.table_name', 'supplier_capabilities')
            ->where('tc.constraint_type', 'FOREIGN KEY')
            ->where('kcu.column_name', 'category_id')
            ->select('tc.constraint_name')
            ->first();

        if ($fk && isset($fk->constraint_name)) {
            DB::statement('ALTER TABLE supplier_capabilities DROP CONSTRAINT ' . $fk->constraint_name);
        }

        DB::statement('DROP INDEX IF EXISTS idx_sup_capabilities_category');

        Schema::table('supplier_capabilities', function (Blueprint $table) {
            $table->dropColumn('category_id');
        });

        DB::statement('ALTER TABLE supplier_capabilities RENAME COLUMN category_uuid TO category_id');
        DB::statement('ALTER TABLE supplier_capabilities ADD CONSTRAINT fk_supplier_capabilities_category FOREIGN KEY (category_id) REFERENCES supplier_categories(id) ON DELETE RESTRICT');
        DB::statement('CREATE INDEX idx_sup_capabilities_category ON supplier_capabilities (category_id)');
    }

    public function down(): void
    {
        // No safe generic downgrade: UUID ids cannot be converted back to legacy integers without a mapping table.
        // Keep schema as-is.
    }
};

