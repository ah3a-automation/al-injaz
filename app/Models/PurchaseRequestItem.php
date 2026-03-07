<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestItem extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'purchase_request_id',
        'boq_item_id',
        'package_id',
        'description_ar',
        'description_en',
        'unit',
        'qty',
        'estimated_cost',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'id'                  => 'string',
            'purchase_request_id' => 'string',
            'boq_item_id'         => 'string',
            'package_id'          => 'string',
            'qty'                 => 'decimal:4',
            'estimated_cost'      => 'decimal:2',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class);
    }

    public function boqItem(): BelongsTo
    {
        return $this->belongsTo(ProjectBoqItem::class, 'boq_item_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProjectPackage::class, 'package_id');
    }
}
