<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notification_templates')) {
            return;
        }

        if (Schema::hasColumn('notification_templates', 'allow_self_notify')) {
            return;
        }

        Schema::table('notification_templates', function (Blueprint $table) {
            $table->boolean('allow_self_notify')->default(false)->after('sms_enabled');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('notification_templates') && Schema::hasColumn('notification_templates', 'allow_self_notify')) {
            Schema::table('notification_templates', function (Blueprint $table) {
                $table->dropColumn('allow_self_notify');
            });
        }
    }
};
