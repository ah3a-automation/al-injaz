<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_boq_search ON project_boq_items
            USING GIN (
                to_tsvector('simple',
                    COALESCE(code, '') || ' ' ||
                    COALESCE(description_en, '') || ' ' ||
                    COALESCE(description_ar, '')
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_boq_search');
    }
};
