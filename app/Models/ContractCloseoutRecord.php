<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractCloseoutRecord extends Model
{
    use HasUuids;

    protected $table = 'contract_closeout_records';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'closeout_status',
        'practical_completion_at',
        'final_completion_at',
        'closeout_notes',
        'prepared_by_user_id',
        'prepared_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'practical_completion_at' => 'datetime',
            'final_completion_at' => 'datetime',
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
