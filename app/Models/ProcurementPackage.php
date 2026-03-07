<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProcurementPackage extends Model
{
    use HasUuids;

    protected $table = 'procurement_packages';

    protected $keyType = 'string';

    public $incrementing = false;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_RFQ_CREATED = 'rfq_created';

    public const STATUS_AWARDED = 'awarded';

    public const STATUS_CONTRACTED = 'contracted';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'project_id',
        'package_no',
        'name',
        'description',
        'currency',
        'needed_by_date',
        'estimated_revenue',
        'estimated_cost',
        'actual_cost',
        'status',
        'created_by',
    ];

    protected $appends = ['estimated_profit', 'estimated_profit_pct', 'actual_profit_pct'];

    protected function casts(): array
    {
        return [
            'id'                 => 'string',
            'project_id'         => 'string',
            'needed_by_date'     => 'date',
            'estimated_revenue'  => 'decimal:2',
            'estimated_cost'     => 'decimal:2',
            'actual_cost'        => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function boqItems(): BelongsToMany
    {
        return $this->belongsToMany(
            ProjectBoqItem::class,
            'procurement_package_items',
            'package_id',
            'boq_item_id'
        )->withTimestamps();
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ProcurementRequest::class, 'package_id');
    }

    public function rfqs(): HasMany
    {
        return $this->hasMany(Rfq::class, 'procurement_package_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ProcurementPackageAttachment::class, 'package_id');
    }

    /** Computed: estimated_revenue - estimated_cost */
    public function getEstimatedProfitAttribute(): float
    {
        return ((float) ($this->estimated_revenue ?? 0)) - ((float) ($this->estimated_cost ?? 0));
    }

    /** Computed: ((estimated_revenue - estimated_cost) / estimated_revenue) * 100 when estimated_revenue > 0 */
    public function getEstimatedProfitPctAttribute(): ?float
    {
        $revenue = (float) ($this->estimated_revenue ?? 0);
        if ($revenue <= 0) {
            return null;
        }

        return (($revenue - (float) ($this->estimated_cost ?? 0)) / $revenue) * 100;
    }

    /** Computed: ((estimated_revenue - actual_cost) / estimated_revenue) * 100 when estimated_revenue > 0 and actual_cost > 0 */
    public function getActualProfitPctAttribute(): ?float
    {
        $revenue = (float) ($this->estimated_revenue ?? 0);
        $actual = (float) ($this->actual_cost ?? 0);
        if ($revenue <= 0 || $actual <= 0) {
            return null;
        }

        return (($revenue - $actual) / $revenue) * 100;
    }
}
