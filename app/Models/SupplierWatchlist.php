<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierWatchlist extends Model
{
    protected $table = 'supplier_watchlists';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'supplier_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
