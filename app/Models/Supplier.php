<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use SoftDeletes;

    public const TYPE_SUPPLIER = 'supplier';

    public const TYPE_SUBCONTRACTOR = 'subcontractor';

    public const TYPE_SERVICE_PROVIDER = 'service_provider';

    public const TYPE_CONSULTANT = 'consultant';

    public const STATUS_PENDING_REGISTRATION = 'pending_registration';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_MORE_INFO_REQUESTED = 'more_info_requested';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_BLACKLISTED = 'blacklisted';

    public const ALLOWED_TRANSITIONS = [
        'pending_registration' => ['approve', 'reject', 'request_info'],
        'pending_review' => ['approve', 'reject', 'request_info'],
        'under_review' => ['approve', 'reject', 'request_info'],
        'more_info_requested' => ['approve', 'reject'],
        'approved' => ['suspend', 'blacklist'],
        'suspended' => ['reactivate', 'blacklist'],
        'rejected' => ['approve'],
        'blacklisted' => ['reactivate'],
    ];

    public const COMPLIANCE_PENDING = 'pending';

    public const COMPLIANCE_VERIFIED = 'verified';

    public const COMPLIANCE_REJECTED = 'rejected';

    protected $table = 'suppliers';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'supplier_code',
        'legal_name_en',
        'legal_name_ar',
        'trade_name',
        'logo_path',
        'supplier_type',
        'country',
        'city',
        'postal_code',
        'address',
        'phone',
        'email',
        'website',
        'status',
        'is_verified',
        'compliance_status',
        'commercial_registration_no',
        'cr_expiry_date',
        'vat_number',
        'unified_number',
        'business_license_number',
        'license_expiry_date',
        'chamber_of_commerce_number',
        'classification_grade',
        'bank_name',
        'bank_country',
        'bank_account_name',
        'bank_account_number',
        'iban',
        'swift_code',
        'preferred_currency',
        'payment_terms_days',
        'credit_limit',
        'tax_withholding_rate',
        'financial_rating',
        'risk_score',
        'notes',
        'registration_token',
        'registration_token_expires_at',
        'created_by_user_id',
        'approved_at',
        'approved_by_user_id',
        'rejected_at',
        'rejected_by_user_id',
        'rejection_reason',
        'approval_notes',
        'more_info_notes',
        'suspended_at',
        'blacklisted_at',
        'supplier_user_id',
        'max_contract_value',
        'workforce_size',
        'equipment_list',
        'capacity_notes',
        'capacity_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'is_verified' => 'boolean',
            'cr_expiry_date' => 'date',
            'license_expiry_date' => 'date',
            'credit_limit' => 'decimal:2',
            'tax_withholding_rate' => 'decimal:2',
            'payment_terms_days' => 'integer',
            'risk_score' => 'integer',
            'registration_token_expires_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'suspended_at' => 'datetime',
            'blacklisted_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function supplierUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supplier_user_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(SupplierContact::class)->orderByDesc('is_primary')->orderBy('name');
    }

    public function users(): HasMany
    {
        return $this->hasMany(SupplierUser::class);
    }

    public function primaryContact(): HasOne
    {
        return $this->hasOne(SupplierContact::class)->where('is_primary', true);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SupplierDocument::class)->orderByDesc('created_at');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(SupplierCategory::class, 'supplier_category_assignments', 'supplier_id', 'category_id');
    }

    public function capabilities(): BelongsToMany
    {
        return $this->belongsToMany(
            SupplierCapability::class,
            'supplier_capability_assignments',
            'supplier_id',
            'capability_id'
        )->withPivot('proficiency_level', 'years_experience');
    }

    public function certifications(): BelongsToMany
    {
        return $this->belongsToMany(
            Certification::class,
            'supplier_certification_assignments',
            'supplier_id',
            'certification_id'
        )->withPivot('certificate_number', 'issued_at', 'expires_at', 'is_verified');
    }

    public function zones(): HasMany
    {
        return $this->hasMany(SupplierZoneAssignment::class);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED)->where('is_verified', true);
    }

    public function scopeByCountry(Builder $query, string $country): Builder
    {
        return $query->where('country', $country);
    }

    public function scopePendingReview(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_UNDER_REVIEW);
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING_REGISTRATION;
    }

    public function isPendingReview(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING_REGISTRATION,
            self::STATUS_PENDING_REVIEW,
            self::STATUS_UNDER_REVIEW,
        ], true);
    }

    public function isUnderReview(): bool
    {
        return $this->status === self::STATUS_UNDER_REVIEW;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isMoreInfoRequested(): bool
    {
        return $this->status === self::STATUS_MORE_INFO_REQUESTED;
    }

    public function hasSupplierLogin(): bool
    {
        return $this->supplier_user_id !== null;
    }

    public function canTransitionTo(string $action): bool
    {
        $allowed = self::ALLOWED_TRANSITIONS[$this->status] ?? [];
        return in_array($action, $allowed, true);
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function isBlacklisted(): bool
    {
        return $this->status === self::STATUS_BLACKLISTED;
    }

    public function hasExpiredDocuments(): bool
    {
        return $this->documents()
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', today())
            ->exists();
    }

    public function hasMandatoryDocuments(): bool
    {
        $mandatoryTypes = SupplierDocument::MANDATORY_TYPES;
        foreach ($mandatoryTypes as $type) {
            if (! $this->documents()->where('document_type', $type)->exists()) {
                return false;
            }
        }
        return true;
    }

    public function generateRegistrationToken(): string
    {
        $token = Str::random(64);
        $this->update([
            'registration_token' => $token,
            'registration_token_expires_at' => now()->addDays(7),
        ]);
        return $token;
    }
}
