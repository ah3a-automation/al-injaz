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
        if (! Schema::hasTable('package_activities')) {
            return;
        }

        Schema::table('package_activities', function (Blueprint $table) {
            if (! Schema::hasColumn('package_activities', 'actor_type')) {
                $table->string('actor_type', 191)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('package_activities', 'actor_id')) {
                $table->string('actor_id', 64)->nullable()->after('actor_type');
            }
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_pkg_act_actor ON package_activities (actor_type, actor_id)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('package_activities')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS idx_pkg_act_actor');
        Schema::table('package_activities', function (Blueprint $table) {
            if (Schema::hasColumn('package_activities', 'actor_type')) {
                $table->dropColumn('actor_type');
            }
            if (Schema::hasColumn('package_activities', 'actor_id')) {
                $table->dropColumn('actor_id');
            }
        });
    }
};
