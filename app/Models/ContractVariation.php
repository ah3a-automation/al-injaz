<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractVariation extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    public const TYPE_COMMERCIAL = 'commercial';

    public const TYPE_TIME = 'time';

    public const TYPE_COMMERCIAL_TIME = 'commercial_time';

    public const TYPE_ADMINISTRATIVE = 'administrative';

    /** @var array<string> */
    public const TYPES = [
        self::TYPE_COMMERCIAL,
        self::TYPE_TIME,
        self::TYPE_COMMERCIAL_TIME,
        self::TYPE_ADMINISTRATIVE,
    ];

    protected $table = 'contract_variations';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'variation_no',
        'title',
        'variation_type',
        'status',
        'reason',
        'description',
        'commercial_delta',
        'currency',
        'time_delta_days',
        'submitted_at',
        'submitted_by_user_id',
        'approved_at',
        'approved_by_user_id',
        'rejected_at',
        'rejected_by_user_id',
        'decision_notes',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'variation_no' => 'string',
            'commercial_delta' => 'decimal:2',
            'time_delta_days' => 'integer',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isSubmitted(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }
}
