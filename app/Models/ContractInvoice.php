<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractInvoice extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_PAID = 'paid';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_PAID,
    ];

    public const TYPE_ADVANCE = 'advance';

    public const TYPE_INTERIM = 'interim';

    public const TYPE_FINAL = 'final';

    public const TYPE_ADMINISTRATIVE = 'administrative';

    /** @var array<string> */
    public const TYPES = [
        self::TYPE_ADVANCE,
        self::TYPE_INTERIM,
        self::TYPE_FINAL,
        self::TYPE_ADMINISTRATIVE,
    ];

    protected $table = 'contract_invoices';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'invoice_no',
        'title',
        'invoice_type',
        'status',
        'description',
        'amount',
        'currency',
        'period_from',
        'period_to',
        'submitted_at',
        'submitted_by_user_id',
        'approved_at',
        'approved_by_user_id',
        'rejected_at',
        'rejected_by_user_id',
        'paid_at',
        'paid_by_user_id',
        'decision_notes',
        'created_by_user_id',
        'updated_by_user_id',
        'invoice_date',
        'retention_amount',
        'net_amount',
        'notes',
        'metadata',
        'submitted_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'amount' => 'decimal:2',
            'retention_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'invoice_date' => 'date',
            'period_from' => 'datetime',
            'period_to' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'paid_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isSubmitted(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}
