<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RfqSupplierQuote extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_REVISED = 'revised';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'rfq_supplier_quotes';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'submitted_at',
        'revision_no',
        'status',
        'total_amount',
        'currency',
        'snapshot_data',
    ];

    protected function casts(): array
    {
        return [
            'id'            => 'string',
            'rfq_id'        => 'string',
            'supplier_id'   => 'string',
            'submitted_at'  => 'datetime',
            'total_amount'  => 'decimal:2',
            'created_at'    => 'datetime',
            'snapshot_data' => 'array',
        ];
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(RfqSupplierQuoteSnapshot::class, 'rfq_supplier_quote_id')->orderBy('revision_no');
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
