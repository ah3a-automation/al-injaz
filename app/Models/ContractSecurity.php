<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractSecurity extends Model
{
    use HasUuids;

    public const TYPE_PERFORMANCE_BOND = 'performance_bond';

    public const TYPE_ADVANCE_PAYMENT_GUARANTEE = 'advance_payment_guarantee';

    public const TYPE_RETENTION_BOND = 'retention_bond';

    public const TYPE_INSURANCE = 'insurance';

    /** @var array<string> */
    public const INSTRUMENT_TYPES = [
        self::TYPE_PERFORMANCE_BOND,
        self::TYPE_ADVANCE_PAYMENT_GUARANTEE,
        self::TYPE_RETENTION_BOND,
        self::TYPE_INSURANCE,
    ];

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRING = 'expiring';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_RELEASED = 'released';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_EXPIRING,
        self::STATUS_EXPIRED,
        self::STATUS_RELEASED,
    ];

    protected $table = 'contract_securities';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'instrument_type',
        'status',
        'provider_name',
        'reference_no',
        'amount',
        'currency',
        'issued_at',
        'expires_at',
        'released_at',
        'notes',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'amount' => 'decimal:2',
            'issued_at' => 'datetime',
            'expires_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isExpiring(): bool
    {
        return $this->status === self::STATUS_EXPIRING;
    }

    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED;
    }

    public function isReleased(): bool
    {
        return $this->status === self::STATUS_RELEASED;
    }
}
