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
        if (! Schema::hasTable('rfq_clarifications')) {
            return;
        }

        Schema::table('rfq_clarifications', function (Blueprint $table) {
            if (! Schema::hasColumn('rfq_clarifications', 'status')) {
                $table->string('status', 20)->default('open')->after('answer');
            }
            if (! Schema::hasColumn('rfq_clarifications', 'actor_type')) {
                $table->string('actor_type', 191)->nullable()->after('answered_by');
            }
            if (! Schema::hasColumn('rfq_clarifications', 'actor_id')) {
                $table->string('actor_id', 64)->nullable()->after('actor_type');
            }
            if (! Schema::hasColumn('rfq_clarifications', 'due_at')) {
                $table->timestampTz('due_at')->nullable()->after('visibility');
            }
        });

        DB::table('rfq_clarifications')->where('visibility', 'private_supplier')->update(['visibility' => 'private']);
        DB::table('rfq_clarifications')->where('visibility', 'broadcast_all')->update(['visibility' => 'public']);
        DB::statement('ALTER TABLE rfq_clarifications DROP CONSTRAINT IF EXISTS chk_rfc_visibility');
        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_visibility CHECK (visibility IN ('public','private'))");
        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_status CHECK (status IN ('open','answered','closed','reopened'))");

        DB::table('rfq_clarifications')->whereNull('answer')->update(['status' => 'open']);
        DB::table('rfq_clarifications')->whereNotNull('answer')->update(['status' => 'answered']);

        DB::statement('CREATE INDEX IF NOT EXISTS idx_rfc_status ON rfq_clarifications (status)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('rfq_clarifications')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS idx_rfc_status');
        DB::statement('ALTER TABLE rfq_clarifications DROP CONSTRAINT IF EXISTS chk_rfc_status');
        DB::statement('ALTER TABLE rfq_clarifications DROP CONSTRAINT IF EXISTS chk_rfc_visibility');
        DB::statement("ALTER TABLE rfq_clarifications ADD CONSTRAINT chk_rfc_visibility CHECK (visibility IN ('private_supplier','broadcast_all'))");
        Schema::table('rfq_clarifications', function (Blueprint $table) {
            if (Schema::hasColumn('rfq_clarifications', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('rfq_clarifications', 'actor_type')) {
                $table->dropColumn('actor_type');
            }
            if (Schema::hasColumn('rfq_clarifications', 'actor_id')) {
                $table->dropColumn('actor_id');
            }
            if (Schema::hasColumn('rfq_clarifications', 'due_at')) {
                $table->dropColumn('due_at');
            }
        });
    }
};
