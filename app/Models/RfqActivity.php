<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RfqActivity extends Model
{
    use HasUuids;

    protected $table = 'rfq_activities';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'rfq_id',
        'user_id',
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

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actor(): MorphTo
    {
        return $this->morphTo();
    }
}
