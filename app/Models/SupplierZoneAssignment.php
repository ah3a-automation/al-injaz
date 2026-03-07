<?php

declare(strict_types=1);

namespace App\Models;

use App\Constants\SaudiZones;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierZoneAssignment extends Model
{
    protected $table = 'supplier_zone_assignments';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'supplier_id',
        'zone_code',
        'zone_name',
        'city_name',
        'city_code',
        'covers_entire_zone',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'covers_entire_zone' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function getZoneNameAttribute(): string
    {
        return SaudiZones::getName($this->zone_code);
    }
}
