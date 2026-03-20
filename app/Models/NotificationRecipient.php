<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class NotificationRecipient extends Model
{
    protected $table = 'notification_recipients';

    /**
     * UUID primary key.
     *
     * Prevent Eloquent from casting UUIDs to integers.
     */
    protected $keyType = 'string';
    public $incrementing = false;

    /** @var array<int, string> */
    protected $fillable = [
        'notification_setting_id',
        'recipient_type',
        'role_name',
        'user_id',
        'recipient_value',
        'resolver_config_json',
        'channel_override',
        'is_enabled',
        'sort_order',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_enabled' => 'boolean',
        'sort_order' => 'integer',
        'resolver_config_json' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function setting(): BelongsTo
    {
        return $this->belongsTo(NotificationSetting::class, 'notification_setting_id', 'id');
    }
}

