<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class ProcurementPackage extends Model
{
    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_APPROVED_FOR_RFQ,
        self::STATUS_RFQ_IN_PROGRESS,
        self::STATUS_EVALUATION,
        self::STATUS_AWARDED,
        self::STATUS_CLOSED,
        self::STATUS_CANCELLED,
    ];
    use HasUuids;

    protected $table = 'procurement_packages';

    protected $keyType = 'string';

    public $incrementing = false;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_APPROVED_FOR_RFQ = 'approved_for_rfq';

    public const STATUS_RFQ_IN_PROGRESS = 'rfq_in_progress';

    public const STATUS_EVALUATION = 'evaluation';

    public const STATUS_AWARDED = 'awarded';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_CANCELLED = 'cancelled';

    public const APPROVAL_DRAFT     = 'draft';
    public const APPROVAL_SUBMITTED = 'submitted';
    public const APPROVAL_APPROVED  = 'approved';
    public const APPROVAL_REJECTED  = 'rejected';

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
        'readiness_score',
        'readiness_cached_at',
        'approval_status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'submitted_for_approval_at',
    ];

    protected $appends = ['estimated_profit', 'estimated_profit_pct', 'actual_profit_pct'];

    protected function casts(): array
    {
        return [
            'id'                    => 'string',
            'project_id'            => 'string',
            'needed_by_date'        => 'date',
            'estimated_revenue'     => 'decimal:2',
            'estimated_cost'        => 'decimal:2',
            'actual_cost'           => 'decimal:2',
            'readiness_cached_at'   => 'datetime',
            'approved_at'          => 'datetime',
            'submitted_for_approval_at' => 'datetime',
        ];
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function canSubmitForApproval(): bool
    {
        return $this->approval_status === self::APPROVAL_DRAFT
            || $this->approval_status === self::APPROVAL_REJECTED;
    }

    public function canApprove(): bool
    {
        return $this->approval_status === self::APPROVAL_SUBMITTED;
    }

    public function canReject(): bool
    {
        return $this->approval_status === self::APPROVAL_SUBMITTED;
    }

    protected static function booted(): void
    {
        static::created(function (self $package): void {
            if (! Schema::hasTable('package_activities')) {
                return;
            }

            $package->activities()->create([
                'activity_type' => 'package_created',
                'description' => 'Procurement package created.',
                'metadata' => [
                    'package_id' => $package->id,
                    'status' => $package->status,
                ],
                'user_id' => $package->created_by,
                'actor_type' => $package->created_by ? User::class : null,
                'actor_id' => $package->created_by ? (string) $package->created_by : null,
            ]);
        });
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

    public function activities(): HasMany
    {
        return $this->hasMany(PackageActivity::class, 'package_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isReadyForRfq(): bool
    {
        return $this->status === self::STATUS_APPROVED_FOR_RFQ;
    }

    public function isRfqInProgress(): bool
    {
        return $this->status === self::STATUS_RFQ_IN_PROGRESS;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_CLOSED, self::STATUS_CANCELLED], true);
    }

    public function getLifecycleLabel(): string
    {
        return match ($this->status) {
            self::STATUS_DRAFT            => 'draft',
            self::STATUS_UNDER_REVIEW     => 'under_review',
            self::STATUS_APPROVED_FOR_RFQ => 'approved',
            self::STATUS_RFQ_IN_PROGRESS  => 'rfq_in_progress',
            self::STATUS_EVALUATION       => 'evaluation',
            self::STATUS_AWARDED          => 'awarded',
            self::STATUS_CLOSED           => 'closed',
            self::STATUS_CANCELLED        => 'cancelled',
            default                       => (string) $this->status,
        };
    }

    /**
     * @return array<int, string>
     */
    public function getAllowedTransitions(): array
    {
        return match ($this->status) {
            self::STATUS_DRAFT => [
                self::STATUS_UNDER_REVIEW,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_UNDER_REVIEW => [
                self::STATUS_APPROVED_FOR_RFQ,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_APPROVED_FOR_RFQ => [
                self::STATUS_RFQ_IN_PROGRESS,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_RFQ_IN_PROGRESS => [
                self::STATUS_EVALUATION,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_EVALUATION => [
                self::STATUS_AWARDED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_AWARDED => [
                self::STATUS_CLOSED,
            ],
            self::STATUS_CLOSED,
            self::STATUS_CANCELLED => [],
            default => [],
        };
    }

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, $this->getAllowedTransitions(), true);
    }

    /**
     * Change package status and record a status_changed activity with metadata.
     */
    public function changeStatus(string $newStatus, ?Model $actor = null): void
    {
        $from = $this->status;
        $this->status = $newStatus;
        $this->save();

        $this->activities()->create([
            'activity_type' => 'status_changed',
            'description'  => "Status changed from {$from} to {$newStatus}",
            'metadata'     => ['from' => $from, 'to' => $newStatus],
            'user_id'      => $actor instanceof User ? $actor->getKey() : null,
            'actor_type'   => $actor !== null ? $actor->getMorphClass() : null,
            'actor_id'     => $actor !== null ? (string) $actor->getKey() : null,
        ]);
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
