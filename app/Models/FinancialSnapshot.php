<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialSnapshot extends Model
{
    protected $table = 'financial_snapshots';

    protected $keyType = 'string';

    public $incrementing = false;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'trigger_type',
        'trigger_id',
        'committed_cost_total',
        'forecast_margin_pct',
        'scope_type',
        'scope_id',
    ];

    protected function casts(): array
    {
        return [
            'id'                   => 'string',
            'project_id'           => 'string',
            'committed_cost_total' => 'decimal:2',
            'forecast_margin_pct'  => 'decimal:4',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
