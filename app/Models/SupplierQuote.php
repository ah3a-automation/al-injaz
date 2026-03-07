<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierQuote extends Model
{
    protected $table = 'supplier_quotes';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'rfq_id', 'supplier_id', 'rfq_supplier_id', 'version_no',
        'total_price', 'currency', 'validity_days', 'valid_until',
        'status', 'attachment_path', 'notes', 'submitted_by', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'id'              => 'string',
            'rfq_id'          => 'string',
            'supplier_id'     => 'string',
            'rfq_supplier_id' => 'string',
            'version_no'      => 'integer',
            'total_price'     => 'decimal:2',
            'validity_days'   => 'integer',
            'valid_until'     => 'date',
            'submitted_at'    => 'datetime',
        ];
    }

    public function rfq(): BelongsTo           { return $this->belongsTo(Rfq::class); }
    public function supplier(): BelongsTo      { return $this->belongsTo(Supplier::class); }
    public function rfqSupplier(): BelongsTo   { return $this->belongsTo(RfqSupplier::class); }
    public function submittedBy(): BelongsTo   { return $this->belongsTo(User::class, 'submitted_by'); }
    public function items(): HasMany           { return $this->hasMany(SupplierQuoteItem::class, 'quote_id'); }
}
