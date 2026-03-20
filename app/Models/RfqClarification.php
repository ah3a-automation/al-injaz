<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RfqClarification extends Model
{
    use HasUuids;

    public const STATUS_OPEN = 'open';

    public const STATUS_ANSWERED = 'answered';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_REOPENED = 'reopened';

    public const VISIBILITY_PUBLIC = 'public';

    public const VISIBILITY_PRIVATE = 'private';

    protected $table = 'rfq_clarifications';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'question',
        'answer',
        'status',
        'visibility',
        'due_at',
        'asked_by',
        'answered_by',
        'answered_at',
        'actor_type',
        'actor_id',
    ];

    protected function casts(): array
    {
        return [
            'id'          => 'string',
            'rfq_id'      => 'string',
            'supplier_id' => 'string',
            'answered_at' => 'datetime',
            'due_at'      => 'datetime',
        ];
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function askedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'asked_by');
    }

    public function answeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by');
    }

    public function actor(): MorphTo
    {
        return $this->morphTo();
    }
}
