<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SystemNotification extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SENT = 'sent';

    public const STATUS_READ = 'read';

    protected $table = 'system_notifications';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'notifiable_type',
        'notifiable_id',
        'event_key',
        'title',
        'message',
        'link',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }
}
