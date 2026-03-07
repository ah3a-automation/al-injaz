<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAssignee extends Model
{
    public const ROLE_RESPONSIBLE = 'responsible';

    public const ROLE_REVIEWER = 'reviewer';

    public const ROLE_WATCHER = 'watcher';

    protected $table = 'task_assignees';

    public $timestamps = true;

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    protected $fillable = [
        'task_id',
        'user_id',
        'role',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
