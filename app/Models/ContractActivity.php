<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ContractActivity extends Model
{
    use HasUuids;

    protected $table = 'contract_activities';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'contract_id',
        'actor_type',
        'actor_id',
        'activity_type',
        'description',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'id'         => 'string',
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function actor(): MorphTo
    {
        return $this->morphTo();
    }
}
