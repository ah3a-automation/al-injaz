<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PackageActivity extends Model
{
    use HasUuids;

    protected $table = 'package_activities';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'package_id',
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

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProcurementPackage::class, 'package_id');
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
