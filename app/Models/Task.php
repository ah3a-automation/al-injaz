<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Task extends Model implements HasMedia
{
    use InteractsWithMedia;
    use SoftDeletes;

    public const STATUS_BACKLOG = 'backlog';

    public const STATUS_OPEN = 'open';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_REVIEW = 'review';

    public const STATUS_DONE = 'done';

    public const STATUS_CANCELLED = 'cancelled';

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_NORMAL = 'normal';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_URGENT = 'urgent';

    protected $table = 'tasks';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'project_id',
        'parent_task_id',
        'created_by_user_id',
        'title',
        'description',
        'status',
        'priority',
        'due_at',
        'start_at',
        'completed_at',
        'estimated_hours',
        'actual_hours',
        'progress_percent',
        'position',
        'visibility',
        'source',
        'tags',
        'reminder_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'due_at' => 'datetime',
            'start_at' => 'datetime',
            'completed_at' => 'datetime',
            'reminder_at' => 'datetime',
            'estimated_hours' => 'decimal:2',
            'actual_hours' => 'decimal:2',
            'progress_percent' => 'integer',
            'position' => 'integer',
            'tags' => 'array',
        ];
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('task_files')->useDisk(
            config('media-library.disk_name', 'public')
        );
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees', 'task_id', 'user_id')
            ->withPivot('role');
    }

    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'depends_on_task_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->orderByDesc('created_at');
    }

    public function links(): HasMany
    {
        return $this->hasMany(TaskLink::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(TaskReminder::class);
    }

    public function isOverdue(): bool
    {
        if (! $this->due_at || ! $this->due_at->isPast()) {
            return false;
        }

        return ! in_array($this->status, [self::STATUS_DONE, self::STATUS_CANCELLED], true);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_DONE;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }
}
