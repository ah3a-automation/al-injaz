<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rfq_awards', function (Blueprint $table): void {
            $table->foreignUuid('rfq_quote_id')
                ->nullable()
                ->after('quote_id')
                ->constrained('rfq_quotes')
                ->nullOnDelete();
        });

        \Illuminate\Support\Facades\DB::statement('ALTER TABLE rfq_awards ALTER COLUMN quote_id DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('rfq_awards', function (Blueprint $table): void {
            $table->dropForeign(['rfq_quote_id']);
        });
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE rfq_awards ALTER COLUMN quote_id SET NOT NULL');
    }
};
