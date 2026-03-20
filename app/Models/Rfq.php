<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Rfq extends Model implements HasMedia
{
    use HasUuids, InteractsWithMedia, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_APPROVED = 'internally_approved';

    public const STATUS_ISSUED = 'issued';

    public const STATUS_SUPPLIER_QUESTIONS = 'supplier_questions_open';

    public const STATUS_RESPONSES_RECEIVED = 'responses_received';

    public const STATUS_UNDER_EVALUATION = 'under_evaluation';

    public const STATUS_RECOMMENDED = 'recommended';

    public const STATUS_AWARDED = 'awarded';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_CANCELLED = 'cancelled';

    public const APPROVAL_DRAFT     = 'draft';
    public const APPROVAL_SUBMITTED = 'submitted';
    public const APPROVAL_APPROVED  = 'approved';
    public const APPROVAL_REJECTED  = 'rejected';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_APPROVED,
        self::STATUS_ISSUED,
        self::STATUS_SUPPLIER_QUESTIONS,
        self::STATUS_RESPONSES_RECEIVED,
        self::STATUS_UNDER_EVALUATION,
        self::STATUS_RECOMMENDED,
        self::STATUS_AWARDED,
        self::STATUS_CLOSED,
        self::STATUS_CANCELLED,
    ];

    protected $table = 'rfqs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'project_id', 'purchase_request_id', 'procurement_package_id', 'rfq_number', 'title',
        'description', 'status', 'version_no', 'addendum_note',
        'submission_deadline', 'validity_period_days', 'currency',
        'require_acceptance', 'created_by', 'issued_by', 'issued_at', 'closed_at',
        'recommended_supplier_id', 'recommendation_notes', 'recommendation_status',
        'recommended_by', 'recommended_at',
        'approval_status', 'rfq_approved_by', 'rfq_approved_at', 'rfq_approval_notes', 'rfq_submitted_for_approval_at',
        'recommendation_approved_by', 'recommendation_approved_at', 'recommendation_approval_notes',
        'recommendation_rejected_by', 'recommendation_rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'id'                  => 'string',
            'project_id'              => 'string',
            'purchase_request_id'     => 'string',
            'procurement_package_id'  => 'string',
            'version_no'          => 'integer',
            'validity_period_days'=> 'integer',
            'submission_deadline' => 'date',
            'require_acceptance'  => 'boolean',
            'issued_at'           => 'datetime',
            'closed_at'           => 'datetime',
            'recommended_at'      => 'datetime',
            'rfq_approved_at'    => 'datetime',
            'rfq_submitted_for_approval_at' => 'datetime',
            'recommendation_approved_at' => 'datetime',
            'recommendation_rejected_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo            { return $this->belongsTo(Project::class); }
    public function purchaseRequest(): BelongsTo    { return $this->belongsTo(PurchaseRequest::class); }
    public function procurementPackage(): BelongsTo { return $this->belongsTo(ProcurementPackage::class, 'procurement_package_id'); }
    public function createdBy(): BelongsTo     { return $this->belongsTo(User::class, 'created_by'); }
    public function issuedBy(): BelongsTo      { return $this->belongsTo(User::class, 'issued_by'); }
    public function items(): HasMany           { return $this->hasMany(RfqItem::class); }
    public function suppliers(): HasMany       { return $this->hasMany(RfqSupplier::class); }
    public function documents(): HasMany       { return $this->hasMany(RfqDocument::class); }
    public function clarifications(): HasMany  { return $this->hasMany(RfqClarification::class); }
    public function quotes(): HasMany          { return $this->hasMany(SupplierQuote::class); }
    public function rfqQuotes(): HasMany      { return $this->hasMany(RfqQuote::class, 'rfq_id'); }
    public function award(): HasOne            { return $this->hasOne(RfqAward::class); }
    public function recommendedSupplier(): BelongsTo { return $this->belongsTo(Supplier::class, 'recommended_supplier_id'); }
    public function recommendedBy(): BelongsTo  { return $this->belongsTo(User::class, 'recommended_by'); }
    public function rfqApprovedBy(): BelongsTo  { return $this->belongsTo(User::class, 'rfq_approved_by'); }
    public function recommendationApprovedBy(): BelongsTo { return $this->belongsTo(User::class, 'recommendation_approved_by'); }
    public function recommendationRejectedBy(): BelongsTo { return $this->belongsTo(User::class, 'recommendation_rejected_by'); }
    public function winningSupplier(): HasOneThrough { return $this->hasOneThrough(Supplier::class, RfqAward::class, 'rfq_id', 'id', 'id', 'supplier_id'); }
    public function contract(): HasOne         { return $this->hasOne(Contract::class); }
    public function activities(): HasMany      { return $this->hasMany(RfqActivity::class); }
    public function invitations(): HasMany     { return $this->hasMany(RfqSupplierInvitation::class); }
    public function rfqSupplierQuotes(): HasMany { return $this->hasMany(RfqSupplierQuote::class); }
    public function evaluations(): HasMany { return $this->hasMany(RfqEvaluation::class); }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isIssued(): bool
    {
        return $this->status === self::STATUS_ISSUED;
    }

    public function isUnderEvaluation(): bool
    {
        return $this->status === self::STATUS_UNDER_EVALUATION;
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
            self::STATUS_DRAFT              => 'draft',
            self::STATUS_APPROVED           => 'approved',
            self::STATUS_ISSUED             => 'issued',
            self::STATUS_SUPPLIER_QUESTIONS => 'clarification_stage',
            self::STATUS_RESPONSES_RECEIVED => 'responses_received',
            self::STATUS_UNDER_EVALUATION   => 'under_evaluation',
            self::STATUS_RECOMMENDED        => 'recommended',
            self::STATUS_AWARDED            => 'awarded',
            self::STATUS_CLOSED             => 'closed',
            self::STATUS_CANCELLED          => 'cancelled',
            default                         => (string) $this->status,
        };
    }

    /**
     * @return array<int, string>
     */
    public function getAllowedTransitions(): array
    {
        return match ($this->status) {
            self::STATUS_DRAFT => [
                self::STATUS_APPROVED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_APPROVED => [
                self::STATUS_ISSUED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_ISSUED => [
                self::STATUS_SUPPLIER_QUESTIONS,
                self::STATUS_RESPONSES_RECEIVED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_SUPPLIER_QUESTIONS => [
                self::STATUS_ISSUED,
                self::STATUS_RESPONSES_RECEIVED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_RESPONSES_RECEIVED => [
                self::STATUS_UNDER_EVALUATION,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_UNDER_EVALUATION => [
                self::STATUS_RECOMMENDED,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_RECOMMENDED => [
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

    public function canSubmitRfqForApproval(): bool
    {
        return $this->approval_status === self::APPROVAL_DRAFT
            || $this->approval_status === self::APPROVAL_REJECTED;
    }

    public function canApproveRfq(): bool
    {
        return $this->approval_status === self::APPROVAL_SUBMITTED;
    }

    public function canRejectRfq(): bool
    {
        return $this->approval_status === self::APPROVAL_SUBMITTED;
    }

    public function canSubmitRecommendationForApproval(): bool
    {
        return $this->recommendation_status === 'submitted'
            && $this->recommendation_approved_at === null
            && $this->recommendation_rejected_at === null;
    }

    public function canApproveRecommendation(): bool
    {
        return $this->recommendation_status === 'submitted'
            && $this->recommendation_approved_at === null
            && $this->recommendation_rejected_at === null;
    }

    public function canRejectRecommendation(): bool
    {
        return $this->recommendation_status === 'submitted'
            && $this->recommendation_approved_at === null
            && $this->recommendation_rejected_at === null;
    }

    /**
     * Change RFQ status and record a status_changed activity with metadata.
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

    /**
     * Generate next RFQ number for current year. Must be called within a DB::transaction
     * so that lockForUpdate() holds until the new RFQ is inserted.
     */
    public static function generateRfqNumber(): string
    {
        $year   = now()->format('Y');
        $prefix = "RFQ-{$year}-";
        $last   = DB::table('rfqs')
            ->where('rfq_number', 'like', $prefix . '%')
            ->orderByDesc('rfq_number')
            ->lockForUpdate()
            ->value('rfq_number');
        $next = $last === null
            ? 1
            : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents');
        $this->addMediaCollection('drawings');
        $this->addMediaCollection('specifications');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('preview')
            ->performOnCollections('documents', 'drawings', 'specifications')
            ->width(600)
            ->format('webp')
            ->optimize();
    }
}
