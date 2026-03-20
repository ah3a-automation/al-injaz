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
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
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

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isArchived(): bool
    {
        return $this->status === self::STATUS_ARCHIVED;
    }
}

