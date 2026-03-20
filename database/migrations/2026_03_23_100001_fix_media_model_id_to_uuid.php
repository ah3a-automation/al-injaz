<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make media.model_id store both bigint (User) and UUID (Supplier, Rfq, etc.).
     * PostgreSQL: convert bigint to varchar(36); existing ids become numeric strings.
     */
    public function up(): void
    {
        if (Schema::hasTable('media') && Schema::hasColumn('media', 'model_id')) {
            DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE VARCHAR(36) USING model_id::text');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('media') && Schema::hasColumn('media', 'model_id')) {
            DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE BIGINT USING NULLIF(trim(model_id), \'\')::bigint');
        }
    }
};
