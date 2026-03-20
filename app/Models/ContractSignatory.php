<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractSignatory extends Model
{
    use HasUuids;

    public const TYPE_INTERNAL = 'internal';

    public const TYPE_SUPPLIER = 'supplier';

    public const STATUS_PENDING = 'pending';

    public const STATUS_SIGNED = 'signed';

    public const STATUS_DECLINED = 'declined';

    public const STATUS_SKIPPED = 'skipped';

    /** @var array<string> */
    public const TYPES = [self::TYPE_INTERNAL, self::TYPE_SUPPLIER];

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SIGNED,
        self::STATUS_DECLINED,
        self::STATUS_SKIPPED,
    ];

    protected $table = 'contract_signatories';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'signatory_type',
        'name',
        'email',
        'title',
        'sign_order',
        'is_required',
        'status',
        'signed_at',
        'notes',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'sign_order' => 'integer',
            'is_required' => 'boolean',
            'signed_at' => 'datetime',
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

    public function events(): HasMany
    {
        return $this->hasMany(ContractSignatureEvent::class, 'contract_signatory_id')->orderByDesc('created_at');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isSigned(): bool
    {
        return $this->status === self::STATUS_SIGNED;
    }

    public function isDeclined(): bool
    {
        return $this->status === self::STATUS_DECLINED;
    }

    public function isSkipped(): bool
    {
        return $this->status === self::STATUS_SKIPPED;
    }
}
