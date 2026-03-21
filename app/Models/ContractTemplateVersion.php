<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable snapshot of a contract template at approval or restore time.
 *
 * @property array<int, array{contract_article_id: string, sort_order: int}>|null $article_snapshot
 */
class ContractTemplateVersion extends Model
{
    use HasUuids;

    protected static function booted(): void
    {
        static::updating(static function (): void {
            throw new \RuntimeException('ContractTemplateVersion is immutable.');
        });
        static::deleting(static function (): void {
            throw new \RuntimeException('ContractTemplateVersion cannot be deleted.');
        });
    }

    protected $table = 'contract_template_versions';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'contract_template_id',
        'version_number',
        'name_en',
        'name_ar',
        'description',
        'template_type',
        'status',
        'internal_notes',
        'article_snapshot',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_template_id' => 'string',
            'version_number' => 'integer',
            'article_snapshot' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ContractTemplate::class, 'contract_template_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
