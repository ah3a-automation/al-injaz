<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Contracts\ContractArticleBlockComposer;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractArticleVersion extends Model
{
    use HasUuids;

    /** @var array<int, string> */
    public const RISK_TAGS = [
        'payment',
        'delay_damages',
        'retention',
        'warranty',
        'termination',
        'indemnity',
        'insurance',
        'variation',
        'dispute_resolution',
        'liability',
        'confidentiality',
        'force_majeure',
    ];

    /** @var array<int, string> */
    public const BLOCK_TYPES = [
        'header',
        'recital',
        'definition',
        'clause',
        'condition',
        'option',
        'note',
    ];

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
        'risk_tags',
        'blocks',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_article_id' => 'string',
            'version_number' => 'integer',
            'risk_tags' => 'array',
            'blocks' => 'array',
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

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getBlocks(): array
    {
        $raw = $this->blocks;
        if (is_array($raw) && $raw !== []) {
            return $raw;
        }

        return ContractArticleBlockComposer::defaultBlocksFromVersionContent($this);
    }

    public function toRenderedContent(string $lang = 'en'): string
    {
        $composer = new ContractArticleBlockComposer();

        return $composer->concatenateBodiesForLang($this->getBlocks(), $lang, true);
    }
}
