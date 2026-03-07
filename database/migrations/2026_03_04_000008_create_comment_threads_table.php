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
        Schema::create('comment_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('commentable_type', 191);
            $table->string('commentable_id', 64);
            $table->string('title', 300)->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->timestampTz('resolved_at')->nullable();
            $table->foreignId('resolved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->timestampTz('deleted_at')->nullable();
        });

        DB::statement('ALTER TABLE comment_threads ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('CREATE INDEX idx_ct_poly ON comment_threads (commentable_type, commentable_id)');
        DB::statement('CREATE INDEX idx_ct_resolved ON comment_threads (is_resolved)');
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_threads');
    }
};
