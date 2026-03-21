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

        if (Schema::hasColumn('notification_templates', 'whatsapp_body')) {
            return;
        }

        Schema::table('notification_templates', function (Blueprint $table): void {
            $table->text('whatsapp_body')->nullable()->after('body_text');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('notification_templates')) {
            return;
        }

        if (! Schema::hasColumn('notification_templates', 'whatsapp_body')) {
            return;
        }

        Schema::table('notification_templates', function (Blueprint $table): void {
            $table->dropColumn('whatsapp_body');
        });
    }
};
