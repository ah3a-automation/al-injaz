<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractAdministrationBaseline extends Model
{
    use HasUuids;

    public const ADMIN_STATUS_NOT_INITIALIZED = 'not_initialized';

    public const ADMIN_STATUS_INITIALIZED = 'initialized';

    /** @var array<string> */
    public const ADMIN_STATUSES = [
        self::ADMIN_STATUS_NOT_INITIALIZED,
        self::ADMIN_STATUS_INITIALIZED,
    ];

    protected $table = 'contract_administration_baselines';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'baseline_version',
        'administration_status',
        'effective_date',
        'commencement_date',
        'completion_date_planned',
        'contract_value_final',
        'currency_final',
        'supplier_reference_no',
        'administration_notes',
        'prepared_by_user_id',
        'prepared_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'baseline_version' => 'integer',
            'effective_date' => 'datetime',
            'commencement_date' => 'datetime',
            'completion_date_planned' => 'datetime',
            'contract_value_final' => 'decimal:2',
            'prepared_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }
}
