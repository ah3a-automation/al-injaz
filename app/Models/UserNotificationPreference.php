<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class UserNotificationPreference extends Model
{
    public const CHANNEL_INAPP = 'inapp';

    public const CHANNEL_EMAIL = 'email';

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public const CHANNEL_SMS = 'sms';

    protected $fillable = [
        'user_id',
        'event_key',
        'channel',
        'is_enabled',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
    }

    /**
     * @param  Builder<UserNotificationPreference>  $query
     * @return Builder<UserNotificationPreference>
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * @param  Builder<UserNotificationPreference>  $query
     * @return Builder<UserNotificationPreference>
     */
    public function scopeForEvent(Builder $query, string $eventKey): Builder
    {
        return $query->where('event_key', $eventKey);
    }

    /**
     * @param  Builder<UserNotificationPreference>  $query
     * @return Builder<UserNotificationPreference>
     */
    public function scopeForChannel(Builder $query, string $channel): Builder
    {
        return $query->where('channel', $channel);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
