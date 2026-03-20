<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractReview extends Model
{
    use HasUuids;

    protected $table = 'contract_reviews';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'review_stage',
        'decision',
        'from_status',
        'to_status',
        'review_notes',
        'decision_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function decisionBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decision_by_user_id');
    }
}

