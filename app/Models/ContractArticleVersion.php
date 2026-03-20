<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractArticleVersion extends Model
{
    use HasUuids;

    protected $table = 'contract_article_versions';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_article_id',
        'version_number',
        'title_ar',
        'title_en',
        'content_ar',
        'content_en',
        'change_summary',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_article_id' => 'string',
            'version_number' => 'integer',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(ContractArticle::class, 'contract_article_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}

