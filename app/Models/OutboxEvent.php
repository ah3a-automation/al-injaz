<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_PROCESSED = 'processed';

    public const STATUS_FAILED = 'failed';

    protected $table = 'outbox_events';

    public $timestamps = false;

    protected $fillable = [
        'event_key',
        'aggregate_type',
        'aggregate_id',
        'payload',
        'status',
        'available_at',
        'processed_at',
        'attempts',
    ];

    protected function casts(): array
    {
        return [
            'payload'      => 'array',
            'available_at' => 'datetime',
            'processed_at' => 'datetime',
            'attempts'     => 'integer',
            'created_at'   => 'datetime',
        ];
    }
}
