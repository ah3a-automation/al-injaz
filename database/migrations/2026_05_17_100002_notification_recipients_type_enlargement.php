<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notification_recipients')) {
            return;
        }

        DB::statement('ALTER TABLE notification_recipients DROP CONSTRAINT IF EXISTS chk_notification_recipients_type');

        DB::statement("ALTER TABLE notification_recipients ADD CONSTRAINT chk_notification_recipients_type CHECK (recipient_type IN (
            'role',
            'user',
            'supplier_user',
            'assigned_user',
            'creator',
            'approver',
            'subject_owner',
            'specific_user',
            'permission',
            'project_role',
            'actor',
            'record_creator',
            'explicit_email'
        ))");
    }

    public function down(): void
    {
        if (! Schema::hasTable('notification_recipients')) {
            return;
        }

        DB::statement('ALTER TABLE notification_recipients DROP CONSTRAINT IF EXISTS chk_notification_recipients_type');

        DB::statement("ALTER TABLE notification_recipients ADD CONSTRAINT chk_notification_recipients_type CHECK (recipient_type IN (
            'role',
            'user',
            'supplier_user',
            'assigned_user',
            'creator',
            'approver',
            'subject_owner',
            'specific_user'
        ))");
    }
};

