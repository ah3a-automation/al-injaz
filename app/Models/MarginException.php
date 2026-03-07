<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarginException extends Model
{
    protected $table = 'margin_exceptions';

    protected $keyType = 'string';

    public $incrementing = false;

    const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'scope_type',
        'scope_id',
        'trigger_context',
        'revenue_at_time',
        'committed_cost_at_time',
        'proposed_cost',
        'projected_total_cost',
        'projected_margin_pct',
        'reason_code',
        'reason_text',
        'requested_by',
        'requested_at',
        'approved_by',
        'approved_at',
        'status',
        'ceo_decision_note',
    ];

    protected function casts(): array
    {
        return [
            'id'                     => 'string',
            'project_id'             => 'string',
            'revenue_at_time'        => 'decimal:2',
            'committed_cost_at_time' => 'decimal:2',
            'proposed_cost'          => 'decimal:2',
            'projected_total_cost'   => 'decimal:2',
            'projected_margin_pct'   => 'decimal:4',
            'requested_at'           => 'datetime',
            'approved_at'            => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException(
                'MarginException is append-only. Use DB::table() for CEO decision updates.'
            );
        });
        static::deleting(function () {
            throw new \RuntimeException(
                'MarginException is append-only and cannot be deleted.'
            );
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
