<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoqChangeLog extends Model
{
    public const CHANGE_ADDED = 'added';

    public const CHANGE_REMOVED = 'removed';

    public const CHANGE_MODIFIED = 'modified';

    protected $table = 'boq_change_logs';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'boq_version_id',
        'item_code',
        'change_type',
        'old_cost',
        'new_cost',
        'cost_impact',
        'old_values',
        'new_values',
        'changed_by',
    ];

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'boq_version_id' => 'string',
            'old_cost'       => 'decimal:2',
            'new_cost'       => 'decimal:2',
            'cost_impact'    => 'decimal:2',
            'old_values'      => 'array',
            'new_values'     => 'array',
        ];
    }

    public function boqVersion(): BelongsTo
    {
        return $this->belongsTo(BoqVersion::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
