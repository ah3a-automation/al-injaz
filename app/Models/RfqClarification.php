<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqClarification extends Model
{
    protected $table = 'rfq_clarifications';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'rfq_id', 'supplier_id', 'question', 'answer',
        'visibility', 'asked_by', 'answered_by', 'answered_at',
    ];

    protected function casts(): array
    {
        return [
            'id'          => 'string',
            'rfq_id'      => 'string',
            'supplier_id' => 'string',
            'answered_at' => 'datetime',
        ];
    }

    public function rfq(): BelongsTo        { return $this->belongsTo(Rfq::class); }
    public function supplier(): BelongsTo   { return $this->belongsTo(Supplier::class); }
    public function askedBy(): BelongsTo    { return $this->belongsTo(User::class, 'asked_by'); }
    public function answeredBy(): BelongsTo { return $this->belongsTo(User::class, 'answered_by'); }
}
