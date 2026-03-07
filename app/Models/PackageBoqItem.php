<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageBoqItem extends Model
{
    protected $table = 'package_boq_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'project_package_id',
        'boq_item_id',
        'allocated_budget_cost',
        'consumed_cost',
        'qty_allocated',
        'consumed_qty',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'id'                    => 'string',
            'project_package_id'    => 'string',
            'boq_item_id'           => 'string',
            'allocated_budget_cost' => 'decimal:2',
            'consumed_cost'         => 'decimal:2',
            'qty_allocated'         => 'decimal:4',
            'consumed_qty'          => 'decimal:4',
        ];
    }

    public function projectPackage(): BelongsTo
    {
        return $this->belongsTo(ProjectPackage::class, 'project_package_id');
    }

    public function boqItem(): BelongsTo
    {
        return $this->belongsTo(ProjectBoqItem::class, 'boq_item_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
