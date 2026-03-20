<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class NotificationSetting extends Model
{
    protected $table = 'notification_settings';

    /**
     * UUID primary key.
     *
     * Without this, Eloquent may cast the UUID to int during serialization, which
     * breaks route identifiers and can also poison FK values during seeding.
     */
    protected $keyType = 'string';
    public $incrementing = false;

    /** @var array<int, string> */
    protected $fillable = [
        'event_key',
        'source_event_key',
        'template_event_code',
        'name',
        'description',
        'notes',
        'module',
        'is_enabled',
        'send_internal',
        'send_email',
        'send_broadcast',
        'send_sms',
        'send_whatsapp',
        'delivery_mode',
        'digest_frequency',
        'environment_scope',
        'conditions_json',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_enabled' => 'boolean',
        'send_internal' => 'boolean',
        'send_email' => 'boolean',
        'send_broadcast' => 'boolean',
        'send_sms' => 'boolean',
        'send_whatsapp' => 'boolean',
        'conditions_json' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function recipients(): HasMany
    {
        return $this->hasMany(NotificationRecipient::class, 'notification_setting_id', 'id');
    }
}

