<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Supplier extends Model implements HasMedia
{
    use InteractsWithMedia, SoftDeletes;

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
        'status',
        'supplier_code',
        'legal_name_en',
        'legal_name_ar',
        'trade_name',
        'logo_path',
        'supplier_type',
        'country',
        'latitude',
        'longitude',
        'coordinates_locked',
        'city',
        'postal_code',
        'address',
        'phone',
        'email',
        'website',
        'compliance_status',
        'commercial_registration_no',
        'cr_expiry_date',
        'vat_number',
        'unified_number',
        'business_license_number',
        'license_expiry_date',
        'insurance_expiry_date',
        'vat_expiry_date',
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
        'tax_withholding_rate',
        'financial_rating',
        'notes',
        'registration_token',
        'registration_token_expires_at',
        'created_by_user_id',
        'approved_at',
        'rejected_at',
        'rejected_by_user_id',
        'rejection_reason',
        'approval_notes',
        'more_info_notes',
        'suspended_at',
        'suspension_reason',
        'suspended_by_user_id',
        'blacklisted_at',
        'blacklist_reason',
        'blacklisted_by_user_id',
        'supplier_user_id',
        'max_contract_value',
        'workforce_size',
        'equipment_list',
        'capacity_notes',
        'capacity_updated_at',
        'ranking_score',
        'ranking_tier',
        'ranking_scored_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'is_verified' => 'boolean',
            'cr_expiry_date' => 'date',
            'license_expiry_date' => 'date',
            'insurance_expiry_date' => 'date',
            'vat_expiry_date' => 'date',
            'credit_limit' => 'decimal:2',
            'tax_withholding_rate' => 'decimal:2',
            'payment_terms_days' => 'integer',
            'risk_score' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'coordinates_locked' => 'boolean',
            'registration_token_expires_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'suspended_at' => 'datetime',
            'blacklisted_at' => 'datetime',
            'ranking_score' => 'decimal:2',
            'ranking_scored_at' => 'datetime',
        ];
    }

    public function awards(): HasMany
    {
        return $this->hasMany(RfqAward::class);
    }

    public function rfqSuppliers(): HasMany
    {
        return $this->hasMany(RfqSupplier::class);
    }

    public function rfqQuotes(): HasMany
    {
        return $this->hasMany(RfqQuote::class);
    }

    public function rfqInvitations(): HasMany
    {
        return $this->hasMany(RfqSupplierInvitation::class, 'supplier_id');
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by_user_id');
    }

    public function blacklistedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blacklisted_by_user_id');
    }

    public function watchers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'supplier_watchlists')
            ->withPivot('notes')
            ->withTimestamps(false);
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

    /**
     * Filter suppliers within radius (km) of a point using Haversine formula.
     */
    public function scopeWithinRadius(Builder $query, float $lat, float $lng, float $radiusKm): Builder
    {
        $expr = '6371 * acos(least(1, greatest(-1, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))))';

        return $query->whereRaw($expr . ' <= ?', [$lat, $lng, $lat, $radiusKm]);
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

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('company_logo')->singleFile();
        $this->addMediaCollection('certifications');
        $this->addMediaCollection('legal_documents');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('logo_small')
            ->performOnCollections('company_logo')
            ->width(120)
            ->height(120)
            ->format('webp')
            ->optimize();

        $this->addMediaConversion('logo_preview')
            ->performOnCollections('company_logo')
            ->width(400)
            ->height(400)
            ->format('webp')
            ->optimize();
    }
}
