<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'event_code' => 'supplier.registered',
                'name' => 'Supplier Registered',
                'subject' => 'New Supplier Registration: {{supplier_name}}',
                'body_text' => 'A new supplier {{supplier_name}} ({{supplier_code}}) has registered and is awaiting review.',
                'body_html' => null,
                'type' => 'info',
                'email_enabled' => true,
                'inapp_enabled' => true,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'supplier.approved',
                'name' => 'Supplier Approved',
                'subject' => 'Your supplier account has been approved — Al Injaz',
                'body_text' => 'Congratulations! Your supplier account {{supplier_name}} has been approved. Please set your password to access the portal.',
                'body_html' => null,
                'type' => 'success',
                'email_enabled' => true,
                'inapp_enabled' => false,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'supplier.rejected',
                'name' => 'Supplier Rejected',
                'subject' => 'Your supplier application was not approved — Al Injaz',
                'body_text' => 'We regret to inform you that your supplier application for {{supplier_name}} has not been approved. Reason: {{rejection_reason}}',
                'body_html' => null,
                'type' => 'danger',
                'email_enabled' => true,
                'inapp_enabled' => false,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'supplier.more_info_requested',
                'name' => 'More Information Required',
                'subject' => 'Additional information required for your supplier application',
                'body_text' => 'We require additional information to process your supplier application. Notes: {{more_info_notes}}',
                'body_html' => null,
                'type' => 'warning',
                'email_enabled' => true,
                'inapp_enabled' => false,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'task.assigned',
                'name' => 'Task Assigned',
                'subject' => 'Task assigned to you: {{task_title}}',
                'body_text' => 'You have been assigned a new task: {{task_title}} in project {{project_name}} by {{assigned_by}}.',
                'body_html' => null,
                'type' => 'info',
                'email_enabled' => false,
                'inapp_enabled' => true,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'project.created',
                'name' => 'Project Created',
                'subject' => 'New project: {{project_name}}',
                'body_text' => 'A new project {{project_name}} has been created by {{created_by}}.',
                'body_html' => null,
                'type' => 'info',
                'email_enabled' => false,
                'inapp_enabled' => true,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'event_code' => 'user.created',
                'name' => 'Welcome — Set Your Password',
                'subject' => 'Welcome to Al Injaz — Please set your password',
                'body_text' => 'Your account has been created. Please set your password to access the system.',
                'body_html' => null,
                'type' => 'info',
                'email_enabled' => true,
                'inapp_enabled' => false,
                'whatsapp_enabled' => false,
                'sms_enabled' => false,
                'allow_self_notify' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('notification_templates')->upsert(
            $templates,
            ['event_code'],
            ['name', 'subject', 'body_text', 'body_html', 'type', 'email_enabled', 'inapp_enabled', 'whatsapp_enabled', 'sms_enabled', 'allow_self_notify', 'updated_at']
        );
    }
}
