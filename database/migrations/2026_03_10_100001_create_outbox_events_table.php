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
        Schema::create('outbox_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('event_key', 150);
            $table->string('aggregate_type', 100);
            $table->string('aggregate_id', 64);
            $table->jsonb('payload');
            $table->string('status', 30)->default('pending');
            $table->timestampTz('available_at')->useCurrent();
            $table->timestampTz('processed_at')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("ALTER TABLE outbox_events ADD CONSTRAINT chk_outbox_status CHECK (status IN ('pending','processing','processed','failed'))");
        DB::statement('CREATE INDEX idx_outbox_status ON outbox_events (status)');
        DB::statement('CREATE INDEX idx_outbox_available_at ON outbox_events (available_at)');
        DB::statement('CREATE INDEX idx_outbox_aggregate ON outbox_events (aggregate_type, aggregate_id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS chk_outbox_status');
        Schema::dropIfExists('outbox_events');
    }
};
