<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractDraftArticle extends Model
{
    use HasUuids;

    public const NEGOTIATION_NOT_REVIEWED = 'not_reviewed';
    public const NEGOTIATION_IN_NEGOTIATION = 'in_negotiation';
    public const NEGOTIATION_AGREED = 'agreed';
    public const NEGOTIATION_DEVIATION_FLAGGED = 'deviation_flagged';
    public const NEGOTIATION_READY_FOR_REVIEW = 'ready_for_review';

    /** @var array<string> */
    public const NEGOTIATION_STATUSES = [
        self::NEGOTIATION_NOT_REVIEWED,
        self::NEGOTIATION_IN_NEGOTIATION,
        self::NEGOTIATION_AGREED,
        self::NEGOTIATION_DEVIATION_FLAGGED,
        self::NEGOTIATION_READY_FOR_REVIEW,
    ];

    public const ORIGIN_TEMPLATE = 'template';

    public const ORIGIN_LIBRARY = 'library';

    public const ORIGIN_MANUAL = 'manual';

    /** @var array<string> */
    public const ORIGINS = [
        self::ORIGIN_TEMPLATE,
        self::ORIGIN_LIBRARY,
        self::ORIGIN_MANUAL,
    ];

    protected $table = 'contract_draft_articles';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'sort_order',
        'source_contract_article_id',
        'source_contract_article_version_id',
        'source_template_id',
        'source_template_item_id',
        'article_code',
        'title_ar',
        'title_en',
        'content_ar',
        'content_en',
        'source_template_content_en',
        'source_template_content_ar',
        'rendered_content_en',
        'rendered_content_ar',
        'used_variable_keys',
        'unresolved_variable_keys',
        'last_rendered_at',
        'origin_type',
        'is_modified',
        'negotiation_status',
        'negotiation_notes',
        'legal_notes',
        'commercial_notes',
        'negotiation_internal_notes',
        'has_deviation',
        'requires_special_approval',
        'negotiation_updated_by_user_id',
        'negotiation_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'source_contract_article_id' => 'string',
            'source_contract_article_version_id' => 'string',
            'source_template_id' => 'string',
            'source_template_item_id' => 'string',
            'sort_order' => 'integer',
            'is_modified' => 'bool',
            'has_deviation' => 'bool',
            'requires_special_approval' => 'bool',
            'used_variable_keys' => 'array',
            'unresolved_variable_keys' => 'array',
            'last_rendered_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class, 'contract_id');
    }

    public function sourceArticle(): BelongsTo
    {
        return $this->belongsTo(ContractArticle::class, 'source_contract_article_id');
    }

    public function sourceArticleVersion(): BelongsTo
    {
        return $this->belongsTo(ContractArticleVersion::class, 'source_contract_article_version_id');
    }

    public function sourceTemplate(): BelongsTo
    {
        return $this->belongsTo(ContractTemplate::class, 'source_template_id');
    }

    public function sourceTemplateItem(): BelongsTo
    {
        return $this->belongsTo(ContractTemplateItem::class, 'source_template_item_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function negotiationUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'negotiation_updated_by_user_id');
    }

    public function isFromTemplate(): bool
    {
        return $this->origin_type === self::ORIGIN_TEMPLATE;
    }

    public function isFromLibrary(): bool
    {
        return $this->origin_type === self::ORIGIN_LIBRARY;
    }

    public function isManual(): bool
    {
        return $this->origin_type === self::ORIGIN_MANUAL;
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ContractDraftArticleVersion::class, 'contract_draft_article_id')
            ->orderByDesc('version_number');
    }

    public function hasHistory(): bool
    {
        return $this->versions()->exists();
    }

    public function negotiationLogs(): HasMany
    {
        return $this->hasMany(ContractDraftArticleNegotiation::class, 'contract_draft_article_id')
            ->orderByDesc('created_at');
    }

    public function isNegotiationNotReviewed(): bool
    {
        return $this->negotiation_status === self::NEGOTIATION_NOT_REVIEWED;
    }

    public function isInNegotiation(): bool
    {
        return $this->negotiation_status === self::NEGOTIATION_IN_NEGOTIATION;
    }

    public function isAgreed(): bool
    {
        return $this->negotiation_status === self::NEGOTIATION_AGREED;
    }

    public function isDeviationFlagged(): bool
    {
        return $this->negotiation_status === self::NEGOTIATION_DEVIATION_FLAGGED;
    }

    public function isReadyForReview(): bool
    {
        return $this->negotiation_status === self::NEGOTIATION_READY_FOR_REVIEW;
    }
}

