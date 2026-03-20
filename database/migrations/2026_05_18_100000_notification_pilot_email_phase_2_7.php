<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notification_settings')) {
            return;
        }

        DB::table('notification_settings')
            ->whereIn('event_key', [
                'rfq.awarded',
                'clarification.added.supplier',
                'clarification.answered',
            ])
            ->update(['send_email' => true]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('notification_settings')) {
            return;
        }

        DB::table('notification_settings')
            ->whereIn('event_key', [
                'rfq.awarded',
                'clarification.added.supplier',
                'clarification.answered',
            ])
            ->update(['send_email' => false]);
    }
};

