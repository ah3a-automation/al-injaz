<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierCapability extends Model
{
    use SoftDeletes;

    protected $table = 'supplier_capabilities';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'name_ar',
        'slug',
        'description',
        'category_id',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(SupplierCategory::class, 'category_id');
    }

    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(
            Supplier::class,
            'supplier_capability_assignments',
            'capability_id',
            'supplier_id'
        )->withPivot('proficiency_level', 'years_experience');
    }
}
