<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractObligation extends Model
{
    use HasUuids;

    public const STATUS_NOT_STARTED = 'not_started';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_FULFILLED = 'fulfilled';

    public const STATUS_OVERDUE = 'overdue';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_NOT_STARTED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_SUBMITTED,
        self::STATUS_FULFILLED,
        self::STATUS_OVERDUE,
    ];

    public const PARTY_INTERNAL = 'internal';

    public const PARTY_SUPPLIER = 'supplier';

    public const PARTY_CLIENT = 'client';

    public const PARTY_CONSULTANT = 'consultant';

    /** @var array<string> */
    public const PARTY_TYPES = [
        self::PARTY_INTERNAL,
        self::PARTY_SUPPLIER,
        self::PARTY_CLIENT,
        self::PARTY_CONSULTANT,
    ];

    protected $table = 'contract_obligations';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'reference_no',
        'title',
        'description',
        'party_type',
        'status',
        'due_at',
        'submitted_at',
        'fulfilled_at',
        'notes',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'due_at' => 'datetime',
            'submitted_at' => 'datetime',
            'fulfilled_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function isOverdue(): bool
    {
        if ($this->status === self::STATUS_FULFILLED) {
            return false;
        }
        return $this->due_at !== null && $this->due_at->isPast();
    }

    public function isNotStarted(): bool
    {
        return $this->status === self::STATUS_NOT_STARTED;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isSubmitted(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function isFulfilled(): bool
    {
        return $this->status === self::STATUS_FULFILLED;
    }
}
