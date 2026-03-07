<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Certification extends Model
{
    use SoftDeletes;

    protected $table = 'certifications';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'name_ar',
        'slug',
        'issuing_body',
        'description',
        'requires_expiry',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requires_expiry' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(
            Supplier::class,
            'supplier_certification_assignments',
            'certification_id',
            'supplier_id'
        )->withPivot('certificate_number', 'issued_at', 'expires_at', 'is_verified');
    }
}
