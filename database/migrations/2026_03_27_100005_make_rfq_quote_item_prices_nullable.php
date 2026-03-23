<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rfq_quote_items')) {
            return;
        }

        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN unit_price DROP DEFAULT');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN total_price DROP DEFAULT');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN unit_price DROP NOT NULL');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN total_price DROP NOT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfq_quote_items')) {
            return;
        }

        DB::statement('UPDATE rfq_quote_items SET unit_price = 0 WHERE unit_price IS NULL');
        DB::statement('UPDATE rfq_quote_items SET total_price = 0 WHERE total_price IS NULL');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN unit_price SET DEFAULT 0');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN total_price SET DEFAULT 0');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN unit_price SET NOT NULL');
        DB::statement('ALTER TABLE rfq_quote_items ALTER COLUMN total_price SET NOT NULL');
    }
};
