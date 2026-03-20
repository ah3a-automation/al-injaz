<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqSupplierInvitation extends Model
{
    use HasUuids;

    public const STATUS_INVITED = 'invited';

    public const STATUS_VIEWED = 'viewed';

    public const STATUS_ACKNOWLEDGED = 'acknowledged';

    public const STATUS_RESPONDED = 'responded';

    public const STATUS_DECLINED = 'declined';

    protected $table = 'rfq_supplier_invitations';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'invited_at',
        'viewed_at',
        'acknowledged_at',
        'responded_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'id'              => 'string',
            'rfq_id'          => 'string',
            'supplier_id'     => 'string',
            'invited_at'      => 'datetime',
            'viewed_at'       => 'datetime',
            'acknowledged_at' => 'datetime',
            'responded_at'    => 'datetime',
            'created_at'      => 'datetime',
        ];
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
