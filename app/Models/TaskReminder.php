<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class TaskReminder extends Model
{
    protected $table = 'task_reminders';

    protected $fillable = [
        'task_id',
        'user_id',
        'remind_at',
        'note',
        'is_sent',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'sent_at' => 'datetime',
            'is_sent' => 'boolean',
        ];
    }

    /**
     * Pending reminders that are due (ready to dispatch).
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('is_sent', false)->where('remind_at', '<=', now());
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
