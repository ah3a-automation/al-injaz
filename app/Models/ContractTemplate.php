<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractTemplate extends Model
{
    use HasUuids;

    public const TYPE_SUPPLY = 'supply';

    public const TYPE_SUPPLY_INSTALL = 'supply_install';

    public const TYPE_SUBCONTRACT = 'subcontract';

    public const TYPE_SERVICE = 'service';

    public const TYPE_CONSULTANCY = 'consultancy';

    /** @var array<string> */
    public const TEMPLATE_TYPES = [
        self::TYPE_SUPPLY,
        self::TYPE_SUPPLY_INSTALL,
        self::TYPE_SUBCONTRACT,
        self::TYPE_SERVICE,
        self::TYPE_CONSULTANCY,
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

    protected $table = 'contract_templates';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'code',
        'name_en',
        'name_ar',
        'template_type',
        'status',
        'description',
        'internal_notes',
        'current_template_version_id',
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
            'current_template_version_id' => 'string',
            'submitted_at' => 'datetime',
            'contracts_manager_approved_at' => 'datetime',
            'legal_approved_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(ContractTemplateItem::class)->orderBy('sort_order');
    }

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(ContractArticle::class, 'contract_template_items', 'contract_template_id', 'contract_article_id')
            ->withPivot('sort_order')
            ->orderBy('contract_template_items.sort_order');
    }

    public function templateVersions(): HasMany
    {
        return $this->hasMany(ContractTemplateVersion::class)->orderByDesc('version_number');
    }

    public function currentTemplateVersion(): BelongsTo
    {
        return $this->belongsTo(ContractTemplateVersion::class, 'current_template_version_id');
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

        $approval = $this->approval_status ?? self::APPROVAL_NONE;

        if (in_array($approval, [self::APPROVAL_NONE, self::APPROVAL_REJECTED], true)) {
            return $this->items()->exists();
        }

        if ($approval === self::APPROVAL_LEGAL_APPROVED && $this->status === self::STATUS_ACTIVE) {
            return $this->items()->exists();
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

