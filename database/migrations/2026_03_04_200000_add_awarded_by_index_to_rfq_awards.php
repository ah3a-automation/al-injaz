<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('rfq_awards')) {
            return;
        }

        DB::statement('CREATE INDEX IF NOT EXISTS idx_ra_awarded_by ON rfq_awards (awarded_by)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_ra_awarded_by');
    }
};
