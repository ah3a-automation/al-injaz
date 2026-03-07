<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectSystem extends Model
{
    protected $fillable = [
        'project_id',
        'code',
        'name_ar',
        'name_en',
        'description',
        'owner_user_id',
        'created_by_user_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'id'         => 'string',
            'project_id' => 'string',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(ProjectPackage::class, 'system_id');
    }

    public function boqItems(): HasMany
    {
        return $this->hasMany(ProjectBoqItem::class, 'system_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
