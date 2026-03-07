<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierQuoteItem extends Model
{
    protected $table = 'supplier_quote_items';
    protected $keyType = 'string';
    public $incrementing = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'quote_id', 'rfq_item_id', 'unit_price', 'qty', 'total_price', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'id'          => 'string',
            'quote_id'    => 'string',
            'rfq_item_id' => 'string',
            'unit_price'  => 'decimal:4',
            'qty'         => 'decimal:4',
            'total_price' => 'decimal:2',
        ];
    }

    public function quote(): BelongsTo   { return $this->belongsTo(SupplierQuote::class, 'quote_id'); }
    public function rfqItem(): BelongsTo { return $this->belongsTo(RfqItem::class); }
}
