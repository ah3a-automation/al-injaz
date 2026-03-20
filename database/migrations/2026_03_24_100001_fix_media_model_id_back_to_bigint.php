<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Keep model_id as VARCHAR to support mixed polymorphic keys
        // (int User IDs and UUID IDs for other models).
        // The Postgres type mismatch is handled at relation level for User media.
        if (! Schema::hasTable('media') || ! Schema::hasColumn('media', 'model_id')) {
            return;
        }
    }

    public function down(): void
    {
        // No-op by design.
        if (! Schema::hasTable('media') || ! Schema::hasColumn('media', 'model_id')) {
            return;
        }
    }
};
