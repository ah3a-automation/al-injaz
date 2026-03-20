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
        if (Schema::hasTable('contract_activities') || ! Schema::hasTable('contracts')) {
            return;
        }

        Schema::create('contract_activities', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('actor_type', 191)->nullable();
            $table->string('actor_id', 64)->nullable();
            $table->string('activity_type', 100);
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_contract ON contract_activities (contract_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_actor ON contract_activities (actor_type, actor_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_ca_created ON contract_activities (created_at)');
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_activities');
    }
};
