<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractDraftArticleVersion extends Model
{
    use HasUuids;

    protected $table = 'contract_draft_article_versions';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_draft_article_id',
        'version_number',
        'title_en',
        'title_ar',
        'content_en',
        'content_ar',
        'change_summary',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_draft_article_id' => 'string',
            'version_number' => 'integer',
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

