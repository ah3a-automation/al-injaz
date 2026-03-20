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

