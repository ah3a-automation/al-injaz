<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractTemplateItem extends Model
{
    use HasUuids;

    protected $table = 'contract_template_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_template_id',
        'contract_article_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_template_id' => 'string',
            'contract_article_id' => 'string',
            'sort_order' => 'integer',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ContractTemplate::class, 'contract_template_id');
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(ContractArticle::class, 'contract_article_id');
    }
}

