<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const LEGACY_NAMES = [
        1 => ['name_en' => 'Civil Works', 'name_ar' => 'أعمال مدنية'],
        2 => ['name_en' => 'Structural Steel', 'name_ar' => 'هياكل معدنية'],
        3 => ['name_en' => 'Electrical', 'name_ar' => 'كهربائي'],
        4 => ['name_en' => 'Mechanical', 'name_ar' => 'ميكانيكي'],
        5 => ['name_en' => 'HVAC & Plumbing', 'name_ar' => 'تكييف وصحية'],
        6 => ['name_en' => 'Finishing & Interiors', 'name_ar' => 'تشطيبات وديكور'],
        7 => ['name_en' => 'IT Systems', 'name_ar' => 'أنظمة تقنية'],
        8 => ['name_en' => 'Materials & Supplies', 'name_ar' => 'مواد وتوريدات'],
        9 => ['name_en' => 'Safety & Security', 'name_ar' => 'سلامة وأمن'],
        10 => ['name_en' => 'Landscaping', 'name_ar' => 'مساحات خضراء'],
        11 => ['name_en' => 'Surveying', 'name_ar' => 'مساحة وتخطيط'],
        12 => ['name_en' => 'Consulting', 'name_ar' => 'استشارات'],
        13 => ['name_en' => 'Other', 'name_ar' => 'أخرى'],
    ];

    /**
     * PostgreSQL: constraint names are unique per schema (not per table). Use pg_catalog for reliable checks.
     */
    private function pgConstraintExistsOnTable(string $table, string $constraintName): bool
    {
        $row = DB::selectOne(
            <<<'SQL'
            SELECT 1 AS x
            FROM pg_constraint c
            INNER JOIN pg_class r ON r.oid = c.conrelid
            INNER JOIN pg_namespace n ON n.oid = r.relnamespace
            WHERE n.nspname = current_schema()
              AND r.relname = ?
              AND c.conname = ?
            SQL,
            [$table, $constraintName],
        );

        return $row !== null;
    }

    private function columnDataType(string $table, string $column): ?string
    {
        $row = DB::selectOne(
            <<<'SQL'
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = ?
              AND column_name = ?
            SQL,
            [$table, $column],
        );

        if ($row === null) {
            return null;
        }

        return (string) ($row->data_type ?? '');
    }

    public function up(): void
    {
        // ── Renames (skip if already done) ─────────────────────────────────
        if (Schema::hasTable('supplier_categories')
            && ! Schema::hasTable('supplier_categories_legacy')
            && Schema::hasColumn('supplier_categories', 'slug')) {
            Schema::rename('supplier_categories', 'supplier_categories_legacy');
        }

        /*
         * Old assignments used a surrogate `id`; the replacement table does not.
         * Do not rename the new table on a re-run.
         */
        if (Schema::hasTable('supplier_category_assignments')
            && ! Schema::hasTable('supplier_category_assignments_legacy')
            && Schema::hasColumn('supplier_category_assignments', 'id')) {
            Schema::rename('supplier_category_assignments', 'supplier_category_assignments_legacy');
        }

        // ── New supplier_categories tree ──────────────────────────────────
        if (! Schema::hasTable('supplier_categories')) {
            Schema::create('supplier_categories', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('parent_id')->nullable();
                $table->string('code', 100)->unique();
                $table->string('name_en', 255);
                $table->string('name_ar', 255);
                $table->integer('level')->unsigned();
                $table->string('supplier_type', 50);
                $table->boolean('is_active')->default(true);
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('updated_at')->useCurrent();
            });
        }

        $tableName = 'supplier_categories';
        if (! $this->pgConstraintExistsOnTable($tableName, 'chk_supplier_categories_supplier_type')) {
            DB::statement("ALTER TABLE {$tableName} ADD CONSTRAINT chk_supplier_categories_supplier_type CHECK (supplier_type IN ('material_supplier','subcontractor','service_provider','manufacturer','laboratory','consultant','equipment_supplier'))");
        }
        if (! $this->pgConstraintExistsOnTable($tableName, 'chk_supplier_categories_level')) {
            DB::statement("ALTER TABLE {$tableName} ADD CONSTRAINT chk_supplier_categories_level CHECK (level >= 1 AND level <= 3)");
        }
        if (! $this->pgConstraintExistsOnTable($tableName, 'fk_supplier_categories_parent')) {
            DB::statement("ALTER TABLE {$tableName} ADD CONSTRAINT fk_supplier_categories_parent FOREIGN KEY (parent_id) REFERENCES {$tableName}(id) ON DELETE RESTRICT");
        }

        DB::statement('DROP INDEX IF EXISTS idx_supplier_categories_parent');
        DB::statement('CREATE INDEX idx_supplier_categories_parent ON supplier_categories (parent_id)');
        DB::statement('DROP INDEX IF EXISTS idx_supplier_categories_active');
        DB::statement('CREATE INDEX idx_supplier_categories_active ON supplier_categories (is_active)');
        DB::statement('DROP INDEX IF EXISTS idx_supplier_categories_level');
        DB::statement('CREATE INDEX idx_supplier_categories_level ON supplier_categories (level)');
        DB::statement('DROP INDEX IF EXISTS idx_supplier_categories_supplier_type');
        DB::statement('CREATE INDEX idx_supplier_categories_supplier_type ON supplier_categories (supplier_type)');

        $now = now()->toIso8601String();
        $legacyUuids = [];
        foreach (self::LEGACY_NAMES as $oldId => $row) {
            $code = 'LEGACY-' . $oldId;
            $existingId = DB::table('supplier_categories')->where('code', $code)->value('id');
            if ($existingId !== null) {
                $legacyUuids[$oldId] = (string) $existingId;

                continue;
            }
            $uuid = (string) Str::uuid();
            $legacyUuids[$oldId] = $uuid;
            DB::table('supplier_categories')->insert([
                'id' => $uuid,
                'parent_id' => null,
                'code' => $code,
                'name_en' => $row['name_en'],
                'name_ar' => $row['name_ar'],
                'level' => 1,
                'supplier_type' => 'material_supplier',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // ── New assignments table ─────────────────────────────────────────
        if (! Schema::hasTable('supplier_category_assignments')) {
            Schema::create('supplier_category_assignments', function (Blueprint $table) {
                $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
                $table->foreignUuid('category_id')->constrained('supplier_categories')->cascadeOnDelete();
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        /*
         * Renaming the old assignments table keeps constraint name `uq_supplier_category` on *_legacy.
         * PostgreSQL requires constraint/index names to be unique in the schema, so ADD on the new table fails
         * until the legacy constraint is dropped (data unchanged).
         */
        if (Schema::hasTable('supplier_category_assignments_legacy')) {
            DB::statement('ALTER TABLE supplier_category_assignments_legacy DROP CONSTRAINT IF EXISTS uq_supplier_category');
        }

        if (! $this->pgConstraintExistsOnTable('supplier_category_assignments', 'uq_supplier_category')) {
            DB::statement('ALTER TABLE supplier_category_assignments ADD CONSTRAINT uq_supplier_category UNIQUE (supplier_id, category_id)');
        }

        DB::statement('DROP INDEX IF EXISTS idx_sca_supplier');
        DB::statement('CREATE INDEX idx_sca_supplier ON supplier_category_assignments (supplier_id)');
        DB::statement('DROP INDEX IF EXISTS idx_sca_category');
        DB::statement('CREATE INDEX idx_sca_category ON supplier_category_assignments (category_id)');

        if (Schema::hasTable('supplier_category_assignments_legacy')) {
            $legacyAssignments = DB::table('supplier_category_assignments_legacy')->get();
            foreach ($legacyAssignments as $row) {
                $newCategoryId = $legacyUuids[(int) $row->category_id] ?? null;
                if ($newCategoryId !== null) {
                    DB::table('supplier_category_assignments')->insertOrIgnore([
                        'supplier_id' => $row->supplier_id,
                        'category_id' => $newCategoryId,
                        'created_at' => $row->created_at ?? $now,
                    ]);
                }
            }
        }

        if (Schema::hasTable('supplier_category_assignments_legacy')) {
            Schema::drop('supplier_category_assignments_legacy');
        }

        // ── supplier_capabilities: bigint category_id → uuid category_id ──
        if (Schema::hasTable('supplier_capabilities')) {
            $hasCategoryId = Schema::hasColumn('supplier_capabilities', 'category_id');
            $hasCategoryUuid = Schema::hasColumn('supplier_capabilities', 'category_uuid');
            $categoryIdType = $hasCategoryId ? $this->columnDataType('supplier_capabilities', 'category_id') : null;

            if ($hasCategoryUuid && ! $hasCategoryId) {
                DB::statement('ALTER TABLE supplier_capabilities RENAME COLUMN category_uuid TO category_id');
                $categoryIdType = 'uuid';
            }

            if ($categoryIdType === 'uuid') {
                if (! $this->pgConstraintExistsOnTable('supplier_capabilities', 'fk_supplier_capabilities_category')) {
                    DB::statement('ALTER TABLE supplier_capabilities ADD CONSTRAINT fk_supplier_capabilities_category FOREIGN KEY (category_id) REFERENCES supplier_categories(id) ON DELETE RESTRICT');
                }
            } elseif ($categoryIdType === 'bigint' || $categoryIdType === 'integer') {
                if (! Schema::hasColumn('supplier_capabilities', 'category_uuid')) {
                    Schema::table('supplier_capabilities', function (Blueprint $table) {
                        $table->uuid('category_uuid')->nullable()->after('id');
                    });
                }
                foreach ($legacyUuids as $oldId => $uuid) {
                    DB::table('supplier_capabilities')->where('category_id', $oldId)->update(['category_uuid' => $uuid]);
                }
                Schema::table('supplier_capabilities', function (Blueprint $table) {
                    $table->dropForeign(['category_id']);
                });
                Schema::table('supplier_capabilities', function (Blueprint $table) {
                    $table->dropColumn('category_id');
                });
                DB::statement('ALTER TABLE supplier_capabilities RENAME COLUMN category_uuid TO category_id');
                if (! $this->pgConstraintExistsOnTable('supplier_capabilities', 'fk_supplier_capabilities_category')) {
                    DB::statement('ALTER TABLE supplier_capabilities ADD CONSTRAINT fk_supplier_capabilities_category FOREIGN KEY (category_id) REFERENCES supplier_categories(id) ON DELETE RESTRICT');
                }
            }
        }

        if (Schema::hasTable('supplier_capabilities') && Schema::hasColumn('supplier_capabilities', 'category_id')) {
            DB::statement('DROP INDEX IF EXISTS idx_sup_capabilities_category');
            DB::statement('CREATE INDEX idx_sup_capabilities_category ON supplier_capabilities (category_id)');
        }

        if (Schema::hasTable('supplier_categories_legacy')) {
            Schema::drop('supplier_categories_legacy');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_category_assignments');
        DB::statement('ALTER TABLE supplier_capabilities DROP CONSTRAINT IF EXISTS fk_supplier_capabilities_category');
        DB::statement('ALTER TABLE supplier_capabilities DROP CONSTRAINT IF EXISTS supplier_capabilities_category_id_foreign');
        if (Schema::hasTable('supplier_capabilities') && Schema::hasColumn('supplier_capabilities', 'category_id')) {
            Schema::table('supplier_capabilities', function (Blueprint $table) {
                $table->dropColumn('category_id');
            });
        }
        Schema::dropIfExists('supplier_categories');

        Schema::create('supplier_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('name_ar', 100)->nullable();
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->smallInteger('sort_order')->default(0);
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement('CREATE UNIQUE INDEX supplier_categories_name_unique ON supplier_categories (name)');
        DB::statement('CREATE UNIQUE INDEX supplier_categories_slug_unique ON supplier_categories (slug)');

        Schema::create('supplier_category_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('supplier_categories')->cascadeOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });
        DB::statement('ALTER TABLE supplier_category_assignments ADD CONSTRAINT uq_supplier_category UNIQUE (supplier_id, category_id)');

        Schema::table('supplier_capabilities', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('id')->constrained('supplier_categories')->nullOnDelete();
        });
        DB::statement('CREATE INDEX idx_sup_capabilities_category ON supplier_capabilities (category_id)');
    }
};
