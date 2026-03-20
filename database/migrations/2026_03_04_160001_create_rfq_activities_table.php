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
        if (Schema::hasTable('rfq_activities') || ! Schema::hasTable('rfqs')) {
            return;
        }

        Schema::create('rfq_activities', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_type', 191)->nullable();
            $table->string('actor_id', 64)->nullable();
            $table->string('activity_type', 64);
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_rfq ON rfq_activities (rfq_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_created ON rfq_activities (created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfq_act_actor ON rfq_activities (actor_type, actor_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('rfq_activities');
    }
};
