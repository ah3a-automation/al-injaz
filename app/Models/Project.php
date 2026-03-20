<?php

declare(strict_types=1);

namespace App\Models;

use App\Domain\Shared\Contracts\SearchableEntity;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Project extends Model implements HasMedia, SearchableEntity
{
    use HasUuids, InteractsWithMedia, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'projects';

    protected $fillable = [
        'id',
        'name',
        'description',
        'status',
        'owner_user_id',
        'start_date',
        'end_date',
        'code',
        'name_ar',
        'name_en',
        'client',
        'planned_margin_pct',
        'min_margin_pct',
        'currency',
        'contract_value',
        'erp_reference_id',
    ];

    protected function casts(): array
    {
        return [
            'id'                 => 'string',
            'owner_user_id'      => 'integer',
            'start_date'         => 'date',
            'end_date'           => 'date',
            'planned_margin_pct' => 'decimal:2',
            'min_margin_pct'     => 'decimal:2',
            'currency'           => 'string',
            'contract_value'     => 'decimal:2',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function rfqs(): HasMany
    {
        return $this->hasMany(Rfq::class);
    }

    // public function memberships(): HasMany { return $this->hasMany(ProjectMembership::class); }
    // public function tasks(): HasMany { return $this->hasMany(Task::class); }
    // public function financialSnapshots(): HasMany { return $this->hasMany(FinancialSnapshot::class); }
    // public function budgetReallocations(): HasMany { return $this->hasMany(BudgetReallocation::class); }

    public function toSearchResult(): array
    {
        return [
            'type' => 'Project',
            'title' => $this->name,
            'subtitle' => $this->status,
            'route' => route('projects.show', $this->id),
        ];
    }

    public static function searchLabel(): string
    {
        return 'Projects';
    }

    public static function searchRoute(): string
    {
        return 'projects.show';
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
    public function systems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\ProjectSystem::class);
    }

    public function packages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\ProjectPackage::class);
    }

    public function boqVersions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\BoqVersion::class);
    }

    public function purchaseRequests(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\PurchaseRequest::class);
    }

    public function activeBoqVersion(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Models\BoqVersion::class)->where('status', 'active');
    }

    public function procurementPackages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ProcurementPackage::class, 'project_id');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('preview')
            ->performOnCollections('documents')
            ->width(600)
            ->format('webp')
            ->optimize();
    }
}
