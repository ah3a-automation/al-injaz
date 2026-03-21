<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    protected $table = 'notification_templates';

    protected $fillable = [
        'event_code',
        'name',
        'subject',
        'body_text',
        'body_html',
        'whatsapp_body',
        'type',
        'email_enabled',
        'inapp_enabled',
        'whatsapp_enabled',
        'sms_enabled',
        'allow_self_notify',
    ];

    protected function casts(): array
    {
        return [
            'email_enabled' => 'boolean',
            'inapp_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'sms_enabled' => 'boolean',
            'allow_self_notify' => 'boolean',
        ];
    }
}
