<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectPackage extends Model
{
    protected $fillable = [
        'project_id',
        'system_id',
        'code',
        'name_ar',
        'name_en',
        'scope_type',
        'budget_cost',
        'planned_cost',
        'awarded_cost',
        'forecast_cost',
        'status',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id'            => 'string',
            'project_id'    => 'string',
            'system_id'     => 'string',
            'budget_cost'   => 'decimal:2',
            'planned_cost'  => 'decimal:2',
            'awarded_cost'  => 'decimal:2',
            'forecast_cost' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(ProjectSystem::class, 'system_id');
    }

    public function boqItems(): BelongsToMany
    {
        return $this->belongsToMany(
            ProjectBoqItem::class,
            'package_boq_items',
            'project_package_id',
            'boq_item_id'
        )->withPivot('allocated_budget_cost', 'consumed_cost', 'remaining_budget', 'qty_allocated', 'consumed_qty')->withTimestamps();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
