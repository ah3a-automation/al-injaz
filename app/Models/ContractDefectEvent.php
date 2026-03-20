<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractDefectEvent extends Model
{
    use HasUuids;

    protected $table = 'contract_defect_events';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_defect_item_id',
        'old_status',
        'new_status',
        'event_notes',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_defect_item_id' => 'string',
        ];
    }

    public function defectItem(): BelongsTo
    {
        return $this->belongsTo(ContractDefectItem::class, 'contract_defect_item_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
