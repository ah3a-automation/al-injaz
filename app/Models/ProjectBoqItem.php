<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectBoqItem extends Model
{
    use HasUuids;

    protected $table = 'project_boq_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'project_id',
        'boq_version_id',
        'system_id',
        'code',
        'description_ar',
        'description_en',
        'unit',
        'qty',
        'unit_price',
        'revenue_amount',
        'planned_cost',
        'specifications',
        'lead_type',
        'is_provisional',
        'parent_item_id',
        'sort_order',
    ];

    /**
     * Computed: revenue_amount - planned_cost. Column kept as optional cache only.
     */
    public function getExpectedMarginAttribute(): float
    {
        return ((float) ($this->revenue_amount ?? 0)) - ((float) ($this->planned_cost ?? 0));
    }

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'project_id'     => 'string',
            'boq_version_id' => 'string',
            'system_id'      => 'string',
            'parent_item_id' => 'string',
            'qty'            => 'decimal:4',
            'unit_price'     => 'decimal:4',
            'revenue_amount' => 'decimal:2',
            'planned_cost'   => 'decimal:2',
            'is_provisional' => 'boolean',
            'sort_order'     => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function boqVersion(): BelongsTo
    {
        return $this->belongsTo(BoqVersion::class);
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(ProjectSystem::class, 'system_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectBoqItem::class, 'parent_item_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ProjectBoqItem::class, 'parent_item_id');
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(
            ProjectPackage::class,
            'package_boq_items',
            'boq_item_id',
            'project_package_id'
        )->withPivot('allocated_budget_cost', 'qty_allocated')->withTimestamps();
    }

    public function procurementPackages(): BelongsToMany
    {
        return $this->belongsToMany(
            ProcurementPackage::class,
            'procurement_package_items',
            'boq_item_id',
            'package_id'
        )->withTimestamps();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(BoqItemDocument::class, 'boq_item_id');
    }
}
