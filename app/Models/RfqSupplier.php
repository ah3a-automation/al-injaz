<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RfqSupplier extends Model
{
    protected $table = 'rfq_suppliers';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'rfq_id', 'supplier_id', 'status', 'invited_at',
        'responded_at', 'decline_reason', 'invited_by',
    ];

    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'rfq_id'       => 'string',
            'supplier_id'  => 'string',
            'invited_at'   => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function rfq(): BelongsTo        { return $this->belongsTo(Rfq::class); }
    public function supplier(): BelongsTo   { return $this->belongsTo(Supplier::class); }
    public function invitedBy(): BelongsTo  { return $this->belongsTo(User::class, 'invited_by'); }
    public function quotes(): HasMany       { return $this->hasMany(SupplierQuote::class, 'rfq_supplier_id'); }
}
