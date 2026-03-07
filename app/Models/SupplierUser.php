<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierUser extends Model
{
    protected $table = 'supplier_users';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'supplier_id',
        'name',
        'email',
        'password',
        'role',
        'is_primary',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'id'            => 'string',
            'supplier_id'   => 'string',
            'is_primary'    => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
