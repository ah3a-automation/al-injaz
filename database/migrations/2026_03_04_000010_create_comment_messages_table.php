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
        Schema::create('comment_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('thread_id')->constrained('comment_threads')->cascadeOnDelete();
            $table->uuid('parent_message_id')->nullable();
            $table->foreignId('author_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->boolean('is_edited')->default(false);
            $table->timestampTz('edited_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        DB::statement('ALTER TABLE comment_messages ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        DB::statement('ALTER TABLE comment_messages ADD CONSTRAINT comment_messages_parent_message_id_foreign FOREIGN KEY (parent_message_id) REFERENCES comment_messages(id) ON DELETE SET NULL');
        DB::statement('CREATE INDEX idx_cm_thread ON comment_messages (thread_id)');
        DB::statement('CREATE INDEX idx_cm_parent ON comment_messages (parent_message_id) WHERE parent_message_id IS NOT NULL');
        DB::statement('CREATE INDEX idx_cm_author ON comment_messages (author_user_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_messages');
    }
};
