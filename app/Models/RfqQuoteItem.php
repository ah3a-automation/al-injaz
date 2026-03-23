<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqQuoteItem extends Model
{
    use HasUuids;

    protected $table = 'rfq_quote_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'rfq_quote_id',
        'rfq_item_id',
        'unit_price',
        'total_price',
        'currency',
        'notes',
        'included_in_other',
    ];

    protected function casts(): array
    {
        return [
            'id'                => 'string',
            'rfq_quote_id'      => 'string',
            'rfq_item_id'       => 'string',
            'unit_price'        => 'decimal:4',
            'total_price'       => 'decimal:4',
            'included_in_other' => 'boolean',
        ];
    }

    public function rfqQuote(): BelongsTo
    {
        return $this->belongsTo(RfqQuote::class, 'rfq_quote_id');
    }

    public function rfqItem(): BelongsTo
    {
        return $this->belongsTo(RfqItem::class, 'rfq_item_id');
    }
}
