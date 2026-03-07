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
        Schema::create('boq_item_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('boq_item_id')->constrained('project_boq_items')->cascadeOnDelete();
            $table->string('title', 255);
            $table->string('file_path', 500);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX idx_bid_boq_item ON boq_item_documents (boq_item_id)');
        DB::statement('CREATE INDEX idx_bid_uploaded_by ON boq_item_documents (uploaded_by) WHERE uploaded_by IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_bid_boq_item');
        DB::statement('DROP INDEX IF EXISTS idx_bid_uploaded_by');
        Schema::dropIfExists('boq_item_documents');
    }
};
