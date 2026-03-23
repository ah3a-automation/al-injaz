<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class RfqSupplierQuoteSnapshot extends Model implements HasMedia
{
    use HasUuids, InteractsWithMedia;

    protected $table = 'rfq_supplier_quote_snapshots';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'rfq_supplier_quote_id',
        'rfq_id',
        'supplier_id',
        'revision_no',
        'snapshot_data',
        'submitted_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'rfq_supplier_quote_id' => 'string',
            'rfq_id' => 'string',
            'supplier_id' => 'string',
            'revision_no' => 'integer',
            'snapshot_data' => 'array',
            'submitted_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function rfqSupplierQuote(): BelongsTo
    {
        return $this->belongsTo(RfqSupplierQuote::class, 'rfq_supplier_quote_id');
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments');
    }
}
