<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierContact extends Model
{
    use SoftDeletes;

    public const TYPE_SALES = 'sales';

    public const TYPE_TECHNICAL = 'technical';

    public const TYPE_FINANCE = 'finance';

    public const TYPE_CONTRACTS = 'contracts';

    public const TYPE_MANAGEMENT = 'management';

    protected $table = 'supplier_contacts';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'supplier_id',
        'name',
        'job_title',
        'department',
        'contact_type',
        'email',
        'phone',
        'mobile',
        'avatar_path',
        'is_primary',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
