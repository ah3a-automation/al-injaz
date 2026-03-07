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
        Schema::create('exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('format', 10);
            $table->string('status', 20)->default('pending');
            $table->jsonb('filters')->nullable();
            $table->string('file_path')->nullable();
            $table->string('error_message')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE exports ADD CONSTRAINT chk_exports_status CHECK (status IN ('pending','processing','completed','failed'))");
        DB::statement("ALTER TABLE exports ADD CONSTRAINT chk_exports_format CHECK (format IN ('xlsx','pdf'))");
        DB::statement('CREATE INDEX idx_exports_user ON exports (user_id)');
        DB::statement('CREATE INDEX idx_exports_status ON exports (status)');
    }

    public function down(): void
    {
        Schema::dropIfExists('exports');
    }
};
