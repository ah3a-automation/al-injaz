<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'activity_logs';

    protected $fillable = [
        'event',
        'subject_type',
        'subject_id',
        'causer_user_id',
        'old_values',
        'new_values',
        'context',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
{
    return [
        'old_values' => 'array',
        'new_values' => 'array',
        'context'    => 'array',
        'created_at' => 'datetime',
    ];
}

    public function causer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'causer_user_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo(name: 'subject', type: 'subject_type', id: 'subject_id');
    }
}
