<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierCategory extends Model
{
    public const SUPPLIER_TYPE_MATERIAL = 'material_supplier';
    public const SUPPLIER_TYPE_SUBCONTRACTOR = 'subcontractor';
    public const SUPPLIER_TYPE_SERVICE_PROVIDER = 'service_provider';
    public const SUPPLIER_TYPE_MANUFACTURER = 'manufacturer';
    public const SUPPLIER_TYPE_LABORATORY = 'laboratory';
    public const SUPPLIER_TYPE_CONSULTANT = 'consultant';
    public const SUPPLIER_TYPE_EQUIPMENT = 'equipment_supplier';

    public const SUPPLIER_TYPES = [
        self::SUPPLIER_TYPE_MATERIAL,
        self::SUPPLIER_TYPE_SUBCONTRACTOR,
        self::SUPPLIER_TYPE_SERVICE_PROVIDER,
        self::SUPPLIER_TYPE_MANUFACTURER,
        self::SUPPLIER_TYPE_LABORATORY,
        self::SUPPLIER_TYPE_CONSULTANT,
        self::SUPPLIER_TYPE_EQUIPMENT,
    ];

    /**
     * Map supplier.supplier_type (form value) to allowed category.supplier_type values for selection.
     *
     * @return list<string>
     */
    public static function categoryTypesForSupplierType(string $supplierType): array
    {
        return match ($supplierType) {
            'subcontractor' => [self::SUPPLIER_TYPE_SUBCONTRACTOR],
            'service_provider' => [self::SUPPLIER_TYPE_SERVICE_PROVIDER],
            'consultant' => [self::SUPPLIER_TYPE_CONSULTANT],
            'supplier' => [self::SUPPLIER_TYPE_MATERIAL, self::SUPPLIER_TYPE_EQUIPMENT, self::SUPPLIER_TYPE_MANUFACTURER],
            default => self::SUPPLIER_TYPES,
        };
    }

    protected $table = 'supplier_categories';

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'parent_id',
        'code',
        'name_en',
        'name_ar',
        'level',
        'supplier_type',
        'is_active',
        'is_legacy',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_legacy' => 'boolean',
            'level' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('code');
    }

    public function suppliers(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Supplier::class, 'supplier_category_assignments', 'category_id', 'supplier_id')
            ->withTimestamps(false);
    }

    public function capabilities(): HasMany
    {
        return $this->hasMany(SupplierCapability::class, 'category_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** Categories that can be selected for suppliers (active, not legacy). */
    public function scopeSelectable(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function (Builder $q) {
                $q->where('is_legacy', false)->orWhereNull('is_legacy');
            });
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id')->where('level', 1);
    }

    public function isRoot(): bool
    {
        return $this->parent_id === null && $this->level === 1;
    }

    public function isLeaf(): bool
    {
        return $this->children()->count() === 0;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, self>
     */
    public function ancestors(): \Illuminate\Database\Eloquent\Collection
    {
        $ancestors = collect();
        $current = $this->parent;
        while ($current !== null) {
            $ancestors->prepend($current);
            $current = $current->parent;
        }
        return $ancestors;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, self>
     */
    public function descendants(): \Illuminate\Database\Eloquent\Collection
    {
        $descendants = collect();
        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->descendants());
        }
        return $descendants;
    }

    public function fullPathLabelEn(string $separator = ' > '): string
    {
        $path = $this->ancestors()->pluck('name_en')->push($this->name_en);
        return $path->implode($separator);
    }

    public function fullPathLabelAr(string $separator = ' > '): string
    {
        $path = $this->ancestors()->pluck('name_ar')->push($this->name_ar);
        return $path->implode($separator);
    }

    /** Display name in the given locale (e.g. 'ar' => name_ar, 'en' => name_en). */
    public function nameForLocale(string $locale): string
    {
        return $locale === 'ar' ? $this->name_ar : $this->name_en;
    }

    /** Full path label in the given locale. */
    public function fullPathLabelForLocale(string $locale, string $separator = ' > '): string
    {
        $path = $this->ancestors()->map(fn (self $a) => $a->nameForLocale($locale))->push($this->nameForLocale($locale));
        return $path->implode($separator);
    }
}
