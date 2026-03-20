<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqAward extends Model
{
    use HasUuids;

    protected $table = 'rfq_awards';
    protected $keyType = 'string';
    public $incrementing = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'rfq_id', 'supplier_id', 'quote_id', 'rfq_quote_id', 'awarded_amount',
        'currency', 'award_note', 'awarded_by', 'awarded_at',
    ];

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'rfq_id'         => 'string',
            'supplier_id'    => 'string',
            'quote_id'       => 'string',
            'rfq_quote_id'   => 'string',
            'awarded_amount' => 'decimal:2',
            'awarded_at'     => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException('RfqAward is append-only.');
        });
        static::deleting(function () {
            throw new \RuntimeException('RfqAward is append-only and cannot be deleted.');
        });
    }

    public function rfq(): BelongsTo      { return $this->belongsTo(Rfq::class); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function quote(): BelongsTo    { return $this->belongsTo(SupplierQuote::class, 'quote_id'); }
    public function rfqQuote(): BelongsTo { return $this->belongsTo(RfqQuote::class, 'rfq_quote_id'); }
    public function awardedBy(): BelongsTo { return $this->belongsTo(User::class, 'awarded_by'); }
}
