<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractDraftArticleNegotiation extends Model
{
    use HasUuids;

    protected $table = 'contract_draft_article_negotiations';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_draft_article_id',
        'negotiation_status',
        'negotiation_notes',
        'legal_notes',
        'commercial_notes',
        'negotiation_internal_notes',
        'has_deviation',
        'requires_special_approval',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_draft_article_id' => 'string',
            'has_deviation' => 'bool',
            'requires_special_approval' => 'bool',
        ];
    }

    public function draftArticle(): BelongsTo
    {
        return $this->belongsTo(ContractDraftArticle::class, 'contract_draft_article_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}

