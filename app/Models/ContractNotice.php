<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractNotice extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ISSUED = 'issued';

    public const STATUS_RESPONDED = 'responded';

    public const STATUS_CLOSED = 'closed';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ISSUED,
        self::STATUS_RESPONDED,
        self::STATUS_CLOSED,
    ];

    protected $table = 'contract_notices';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'notice_no',
        'title',
        'description',
        'status',
        'issued_at',
        'responded_at',
        'closed_at',
        'notes',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'issued_at' => 'datetime',
            'responded_at' => 'datetime',
            'closed_at' => 'datetime',
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

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isIssued(): bool
    {
        return $this->status === self::STATUS_ISSUED;
    }

    public function isResponded(): bool
    {
        return $this->status === self::STATUS_RESPONDED;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }
}
