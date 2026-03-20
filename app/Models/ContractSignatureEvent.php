<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractSignatureEvent extends Model
{
    use HasUuids;

    public const EVENT_SIGNATORY_ADDED = 'signatory_added';

    public const EVENT_SIGNATORY_UPDATED = 'signatory_updated';

    public const EVENT_MARKED_SIGNED = 'marked_signed';

    public const EVENT_MARKED_DECLINED = 'marked_declined';

    public const EVENT_MARKED_SKIPPED = 'marked_skipped';

    public const EVENT_CONTRACT_EXECUTED = 'contract_executed';

    /** @var array<string> */
    public const EVENT_TYPES = [
        self::EVENT_SIGNATORY_ADDED,
        self::EVENT_SIGNATORY_UPDATED,
        self::EVENT_MARKED_SIGNED,
        self::EVENT_MARKED_DECLINED,
        self::EVENT_MARKED_SKIPPED,
        self::EVENT_CONTRACT_EXECUTED,
    ];

    protected $table = 'contract_signature_events';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'contract_signatory_id',
        'event_type',
        'event_notes',
        'old_status',
        'new_status',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'contract_signatory_id' => 'string',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function signatory(): BelongsTo
    {
        return $this->belongsTo(ContractSignatory::class, 'contract_signatory_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
