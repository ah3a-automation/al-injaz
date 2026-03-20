<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contract extends Model
{
    use HasUuids;
    public const STATUS_DRAFT = 'draft';

    public const STATUS_UNDER_PREPARATION = 'under_preparation';

    public const STATUS_READY_FOR_REVIEW = 'ready_for_review';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_PENDING_SIGNATURE = 'pending_signature';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_TERMINATED = 'terminated';

    public const STATUS_IN_LEGAL_REVIEW = 'in_legal_review';

    public const STATUS_IN_COMMERCIAL_REVIEW = 'in_commercial_review';

    public const STATUS_IN_MANAGEMENT_REVIEW = 'in_management_review';

    public const STATUS_RETURNED_FOR_REWORK = 'returned_for_rework';

    public const STATUS_APPROVED_FOR_SIGNATURE = 'approved_for_signature';

    public const STATUS_SIGNATURE_PACKAGE_ISSUED = 'signature_package_issued';

    public const STATUS_AWAITING_INTERNAL_SIGNATURE = 'awaiting_internal_signature';

    public const STATUS_AWAITING_SUPPLIER_SIGNATURE = 'awaiting_supplier_signature';

    public const STATUS_PARTIALLY_SIGNED = 'partially_signed';

    public const STATUS_FULLY_SIGNED = 'fully_signed';

    public const STATUS_EXECUTED = 'executed';

    public const ADMIN_STATUS_NOT_INITIALIZED = 'not_initialized';

    public const ADMIN_STATUS_INITIALIZED = 'initialized';

    public const CLOSEOUT_STATUS_NOT_READY = 'not_ready';

    public const CLOSEOUT_STATUS_READY_FOR_CLOSEOUT = 'ready_for_closeout';

    public const CLOSEOUT_STATUS_CLOSED_OUT = 'closed_out';

    /** @var array<string> */
    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_UNDER_PREPARATION,
        self::STATUS_READY_FOR_REVIEW,
        self::STATUS_IN_LEGAL_REVIEW,
        self::STATUS_IN_COMMERCIAL_REVIEW,
        self::STATUS_IN_MANAGEMENT_REVIEW,
        self::STATUS_RETURNED_FOR_REWORK,
        self::STATUS_APPROVED_FOR_SIGNATURE,
        self::STATUS_SIGNATURE_PACKAGE_ISSUED,
        self::STATUS_AWAITING_INTERNAL_SIGNATURE,
        self::STATUS_AWAITING_SUPPLIER_SIGNATURE,
        self::STATUS_PARTIALLY_SIGNED,
        self::STATUS_FULLY_SIGNED,
        self::STATUS_EXECUTED,
        self::STATUS_CANCELLED,
        self::STATUS_PENDING_SIGNATURE,
        self::STATUS_ACTIVE,
        self::STATUS_COMPLETED,
        self::STATUS_TERMINATED,
    ];

    protected $table = 'contracts';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'rfq_id',
        'project_id',
        'procurement_package_id',
        'supplier_id',
        'contract_number',
        'title_en',
        'title_ar',
        'contract_value',
        'commercial_total',
        'currency',
        'status',
        'source_type',
        'signed_at',
        'start_date',
        'end_date',
        'description',
        'internal_notes',
        'contract_template_id',
        'created_by',
        'updated_by_user_id',
        'submitted_for_review_at',
        'submitted_for_review_by_user_id',
        'review_completed_at',
        'review_completed_by_user_id',
        'review_return_reason',
        'approval_summary',
        'finalized_for_signature_at',
        'finalized_for_signature_by_user_id',
        'current_issue_package_id',
        'is_locked_for_signature',
        'executed_at',
        'executed_by_user_id',
        'administration_status',
        'administration_initialized_at',
        'administration_initialized_by_user_id',
        'administration_notes',
        'effective_date',
        'commencement_date',
        'completion_date_planned',
        'contract_value_final',
        'currency_final',
        'supplier_reference_no',
        'variation_total_approved',
        'variation_days_total_approved',
        'variation_count_total',
        'variation_count_approved',
        'invoice_total_submitted',
        'invoice_total_approved',
        'invoice_total_paid',
        'invoice_count_total',
        'invoice_count_approved',
        'invoice_count_paid',
        'closeout_status',
        'closeout_initialized_at',
        'closeout_initialized_by_user_id',
        'closeout_completed_at',
        'closeout_completed_by_user_id',
        'practical_completion_at',
        'final_completion_at',
        'closeout_notes',
        'defects_liability_start_at',
        'defects_liability_end_at',
        'warranty_status',
        'retention_total_held',
        'retention_total_released',
        'retention_total_pending',
    ];

    protected function casts(): array
    {
        return [
            'id'              => 'string',
            'rfq_id'          => 'string',
            'project_id'      => 'string',
            'procurement_package_id' => 'string',
            'supplier_id'     => 'string',
            'contract_value'  => 'decimal:2',
            'commercial_total' => 'decimal:2',
            'signed_at'       => 'datetime',
            'start_date'      => 'datetime',
            'end_date'        => 'datetime',
            'submitted_for_review_at' => 'datetime',
            'review_completed_at' => 'datetime',
            'finalized_for_signature_at' => 'datetime',
            'executed_at' => 'datetime',
            'administration_initialized_at' => 'datetime',
            'effective_date' => 'datetime',
            'commencement_date' => 'datetime',
            'completion_date_planned' => 'datetime',
            'contract_value_final' => 'decimal:2',
            'variation_total_approved' => 'decimal:2',
            'invoice_total_submitted' => 'decimal:2',
            'invoice_total_approved' => 'decimal:2',
            'invoice_total_paid' => 'decimal:2',
            'closeout_initialized_at' => 'datetime',
            'closeout_completed_at' => 'datetime',
            'practical_completion_at' => 'datetime',
            'final_completion_at' => 'datetime',
            'defects_liability_start_at' => 'datetime',
            'defects_liability_end_at' => 'datetime',
            'retention_total_held' => 'decimal:2',
            'retention_total_released' => 'decimal:2',
            'retention_total_pending' => 'decimal:2',
        ];
    }

    public function administrationBaselines(): HasMany
    {
        return $this->hasMany(ContractAdministrationBaseline::class)->orderBy('baseline_version');
    }

    public function administrationInitializedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administration_initialized_by_user_id');
    }

    public function closeoutRecords(): HasMany
    {
        return $this->hasMany(ContractCloseoutRecord::class)->orderByDesc('prepared_at');
    }

    public function closeoutInitializedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closeout_initialized_by_user_id');
    }

    public function closeoutCompletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closeout_completed_by_user_id');
    }

    public function defectItems(): HasMany
    {
        return $this->hasMany(ContractDefectItem::class)->orderBy('reference_no');
    }

    public function retentionReleases(): HasMany
    {
        return $this->hasMany(ContractRetentionRelease::class)->orderBy('release_no');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(ContractClaim::class)->orderBy('claim_no');
    }

    public function notices(): HasMany
    {
        return $this->hasMany(ContractNotice::class)->orderBy('notice_no');
    }

    public function securities(): HasMany
    {
        return $this->hasMany(ContractSecurity::class)->orderBy('created_at');
    }

    public function obligations(): HasMany
    {
        return $this->hasMany(ContractObligation::class)->orderBy('reference_no');
    }

    public function signatories(): HasMany
    {
        return $this->hasMany(ContractSignatory::class)->orderBy('sign_order');
    }

    public function signatureEvents(): HasMany
    {
        return $this->hasMany(ContractSignatureEvent::class)->orderByDesc('created_at');
    }

    public function executedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by_user_id');
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function procurementPackage(): BelongsTo
    {
        return $this->belongsTo(ProcurementPackage::class, 'procurement_package_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ContractTemplate::class, 'contract_template_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function submittedForReviewBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_for_review_by_user_id');
    }

    public function reviewCompletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'review_completed_by_user_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ContractReview::class)->orderByDesc('created_at');
    }

    public function draftArticles(): HasMany
    {
        return $this->hasMany(ContractDraftArticle::class)->orderBy('sort_order');
    }

    public function variableOverrides(): HasMany
    {
        return $this->hasMany(ContractVariableOverride::class)->orderBy('variable_key');
    }

    public function hasUnresolvedMergeFields(): bool
    {
        return $this->draftArticles()->whereNotNull('unresolved_variable_keys')
            ->whereRaw("COALESCE(unresolved_variable_keys::jsonb, '[]'::jsonb) != '[]'::jsonb")
            ->exists();
    }

    public function generatedDocuments(): HasMany
    {
        return $this->hasMany(ContractGeneratedDocument::class)->orderByDesc('generated_at');
    }

    public function latestGeneratedDocumentByType(string $type): ?ContractGeneratedDocument
    {
        return $this->generatedDocuments()->where('document_type', $type)->first();
    }

    public function canGenerateDocuments(): bool
    {
        return ! $this->hasUnresolvedMergeFields()
            && $this->draftArticles()->exists();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ContractActivity::class);
    }

    public function variations(): HasMany
    {
        return $this->hasMany(ContractVariation::class)->orderBy('variation_no');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(ContractInvoice::class);
    }

    public function issuePackages(): HasMany
    {
        return $this->hasMany(ContractIssuePackage::class)->orderBy('issue_version');
    }

    public function currentIssuePackage(): BelongsTo
    {
        return $this->belongsTo(ContractIssuePackage::class, 'current_issue_package_id');
    }

    public function finalizedForSignatureBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_for_signature_by_user_id');
    }

    /**
     * Base contract value plus approved variation total (rollup when present, else sum from variations).
     */
    public function getCurrentContractValue(): float
    {
        $base = (float) $this->contract_value;
        if ($this->variation_total_approved !== null) {
            return $base + (float) $this->variation_total_approved;
        }
        $approved = $this->variations()->where('status', ContractVariation::STATUS_APPROVED)->get();
        $delta = $approved->sum(fn ($v) => (float) ($v->commercial_delta ?? 0));

        return $base + $delta;
    }

    /**
     * Sum of amount for invoices with status approved or paid (rollup when set, else sum from DB).
     */
    public function getApprovedInvoiceTotal(): float
    {
        if ($this->invoice_total_approved !== null) {
            return (float) $this->invoice_total_approved;
        }
        return (float) $this->invoices()
            ->whereIn('status', [ContractInvoice::STATUS_APPROVED, ContractInvoice::STATUS_PAID])
            ->get()
            ->sum(fn ($inv) => (float) ($inv->amount ?? 0));
    }

    /**
     * Sum of amount for invoices with status paid (rollup when set, else sum from DB).
     */
    public function getPaidInvoiceTotal(): float
    {
        if ($this->invoice_total_paid !== null) {
            return (float) $this->invoice_total_paid;
        }
        return (float) $this->invoices()
            ->where('status', ContractInvoice::STATUS_PAID)
            ->get()
            ->sum(fn ($inv) => (float) ($inv->amount ?? 0));
    }

    /**
     * Current contract value (including variations) minus paid invoice total.
     */
    public function getOutstandingBalance(): float
    {
        return $this->getCurrentContractValue() - $this->getPaidInvoiceTotal();
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isUnderPreparation(): bool
    {
        return $this->status === self::STATUS_UNDER_PREPARATION;
    }

    public function isReadyForReview(): bool
    {
        return $this->status === self::STATUS_READY_FOR_REVIEW;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * @return array<string>
     */
    public function getAllowedPreparationTransitions(): array
    {
        return match ($this->status) {
            self::STATUS_DRAFT => [
                self::STATUS_UNDER_PREPARATION,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_UNDER_PREPARATION => [
                self::STATUS_READY_FOR_REVIEW,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_READY_FOR_REVIEW => [
                self::STATUS_UNDER_PREPARATION,
                self::STATUS_CANCELLED,
            ],
            default => [],
        };
    }

    public function canPreparationTransitionTo(string $status): bool
    {
        return in_array($status, $this->getAllowedPreparationTransitions(), true);
    }

    public function isPendingSignature(): bool
    {
        return $this->status === self::STATUS_PENDING_SIGNATURE;
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isTerminated(): bool
    {
        return $this->status === self::STATUS_TERMINATED;
    }

    public function isApprovedForSignature(): bool
    {
        return $this->status === self::STATUS_APPROVED_FOR_SIGNATURE;
    }

    public function isSignaturePackageIssued(): bool
    {
        return $this->status === self::STATUS_SIGNATURE_PACKAGE_ISSUED;
    }

    public function isLockedForSignature(): bool
    {
        return (bool) $this->is_locked_for_signature;
    }

    public function isAwaitingInternalSignature(): bool
    {
        return $this->status === self::STATUS_AWAITING_INTERNAL_SIGNATURE;
    }

    public function isAwaitingSupplierSignature(): bool
    {
        return $this->status === self::STATUS_AWAITING_SUPPLIER_SIGNATURE;
    }

    public function isPartiallySigned(): bool
    {
        return $this->status === self::STATUS_PARTIALLY_SIGNED;
    }

    public function isFullySigned(): bool
    {
        return $this->status === self::STATUS_FULLY_SIGNED;
    }

    public function isExecuted(): bool
    {
        return $this->status === self::STATUS_EXECUTED;
    }

    public function isAdministrationInitialized(): bool
    {
        return $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canInitializeAdministration(): bool
    {
        return $this->status === self::STATUS_EXECUTED;
    }

    public function canManageVariations(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canManageInvoices(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function isReadyForCloseout(): bool
    {
        return $this->closeout_status === self::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT;
    }

    public function isClosedOut(): bool
    {
        return $this->closeout_status === self::CLOSEOUT_STATUS_CLOSED_OUT;
    }

    public function canInitializeCloseout(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canCompleteCloseout(): bool
    {
        return $this->closeout_status === self::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT;
    }

    public function canManageDefects(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED
            && in_array($this->closeout_status, [self::CLOSEOUT_STATUS_READY_FOR_CLOSEOUT, self::CLOSEOUT_STATUS_CLOSED_OUT], true);
    }

    public function canManageRetentionReleases(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canManageClaims(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canManageNotices(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canManageSecurities(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }

    public function canManageObligations(): bool
    {
        return $this->status === self::STATUS_EXECUTED
            && $this->administration_status === self::ADMIN_STATUS_INITIALIZED;
    }
}
