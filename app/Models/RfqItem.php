<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RfqItem extends Model
{
    protected $table = 'rfq_items';
    protected $keyType = 'string';
    public $incrementing = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'rfq_id', 'boq_item_id', 'pr_item_id', 'code',
        'description_ar', 'description_en', 'unit', 'qty',
        'estimated_cost', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'rfq_id'         => 'string',
            'boq_item_id'    => 'string',
            'pr_item_id'     => 'string',
            'qty'            => 'decimal:4',
            'estimated_cost' => 'decimal:2',
            'sort_order'     => 'integer',
        ];
    }

    public function rfq(): BelongsTo         { return $this->belongsTo(Rfq::class); }
    public function boqItem(): BelongsTo     { return $this->belongsTo(ProjectBoqItem::class, 'boq_item_id'); }
    public function prItem(): BelongsTo      { return $this->belongsTo(PurchaseRequestItem::class, 'pr_item_id'); }
    public function quoteItems(): HasMany    { return $this->hasMany(SupplierQuoteItem::class, 'rfq_item_id'); }
    public function rfqQuoteItems(): HasMany { return $this->hasMany(RfqQuoteItem::class, 'rfq_item_id'); }
}
