<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractArticle extends Model
{
    use HasUuids;

    public const CATEGORY_MANDATORY = 'mandatory';

    public const CATEGORY_RECOMMENDED = 'recommended';

    public const CATEGORY_OPTIONAL = 'optional';

    /** @var array<string> */
    public const CATEGORIES = [
        self::CATEGORY_MANDATORY,
        self::CATEGORY_RECOMMENDED,
        self::CATEGORY_OPTIONAL,
    ];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_ARCHIVED = 'archived';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_ARCHIVED,
    ];

    public const APPROVAL_NONE = 'none';

    public const APPROVAL_SUBMITTED = 'submitted';

    public const APPROVAL_CONTRACTS_APPROVED = 'contracts_approved';

    public const APPROVAL_LEGAL_APPROVED = 'legal_approved';

    public const APPROVAL_REJECTED = 'rejected';

    /** @var array<string> */
    public const APPROVAL_STATUSES = [
        self::APPROVAL_NONE,
        self::APPROVAL_SUBMITTED,
        self::APPROVAL_CONTRACTS_APPROVED,
        self::APPROVAL_LEGAL_APPROVED,
        self::APPROVAL_REJECTED,
    ];

    protected $table = 'contract_articles';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'code',
        'serial',
        'category',
        'status',
        'current_version_id',
        'internal_notes',
        'variable_keys',
        'approval_status',
        'submitted_at',
        'submitted_by_user_id',
        'contracts_manager_approved_at',
        'contracts_manager_approved_by',
        'legal_approved_at',
        'legal_approved_by',
        'rejection_reason',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'serial' => 'integer',
            'current_version_id' => 'string',
            'variable_keys' => 'array',
            'submitted_at' => 'datetime',
            'contracts_manager_approved_at' => 'datetime',
            'legal_approved_at' => 'datetime',
        ];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ContractArticleVersion::class)
            ->orderByDesc('version_number');
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(ContractArticleVersion::class, 'current_version_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function contractsManagerApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contracts_manager_approved_by');
    }

    public function legalApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'legal_approved_by');
    }

    public function isPendingApproval(): bool
    {
        return in_array($this->approval_status ?? self::APPROVAL_NONE, [
            self::APPROVAL_SUBMITTED,
            self::APPROVAL_CONTRACTS_APPROVED,
        ], true);
    }

    public function isApproved(): bool
    {
        return ($this->approval_status ?? self::APPROVAL_NONE) === self::APPROVAL_LEGAL_APPROVED;
    }

    public function canBeSubmitted(): bool
    {
        if ($this->isArchived()) {
            return false;
        }

        $status = $this->approval_status ?? self::APPROVAL_NONE;

        if (in_array($status, [self::APPROVAL_NONE, self::APPROVAL_REJECTED], true)) {
            return $this->current_version_id !== null;
        }

        if ($status === self::APPROVAL_LEGAL_APPROVED && $this->status === self::STATUS_ACTIVE) {
            return $this->current_version_id !== null;
        }

        return false;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isArchived(): bool
    {
        return $this->status === self::STATUS_ARCHIVED;
    }
}

