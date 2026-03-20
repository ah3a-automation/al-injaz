<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqEvaluation extends Model
{
    use HasUuids;

    protected $table = 'rfq_evaluations';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'evaluator_id',
        'price_score',
        'technical_score',
        'commercial_score',
        'total_score',
        'comments',
    ];

    protected function casts(): array
    {
        return [
            'id'               => 'string',
            'price_score'     => 'decimal:2',
            'technical_score' => 'decimal:2',
            'commercial_score'=> 'decimal:2',
            'total_score'     => 'decimal:2',
            'created_at'      => 'datetime',
        ];
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }
}
