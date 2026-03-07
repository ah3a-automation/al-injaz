<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementRequest extends Model
{
    use HasUuids;

    protected $table = 'procurement_requests';

    protected $keyType = 'string';

    public $incrementing = false;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ISSUED = 'issued';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'package_id',
        'request_no',
        'status',
        'issued_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'id'         => 'string',
            'package_id' => 'string',
            'issued_at'  => 'datetime',
        ];
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProcurementPackage::class, 'package_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
