<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class SupplierDocument extends Model
{
    use SoftDeletes;

    public const TYPE_CR = 'commercial_registration';

    public const TYPE_UNIFIED = 'unified_number';

    public const TYPE_VAT = 'vat_certificate';

    public const TYPE_LICENSE = 'business_license';

    public const TYPE_NATIONAL_ADDRESS = 'national_address';

    public const TYPE_BANK_LETTER = 'bank_letter';

    public const TYPE_COMPANY_PROFILE = 'company_profile';

    public const TYPE_ISO = 'iso_certificate';

    public const TYPE_CREDIT_APPLICATION = 'credit_application';

    public const TYPE_OTHER = 'other';

    /** @var array<int, string> */
    public const MANDATORY_TYPES = [
        self::TYPE_CR,
        self::TYPE_UNIFIED,
        self::TYPE_VAT,
        self::TYPE_NATIONAL_ADDRESS,
    ];

    /** @var array<string, string> */
    private const FILE_NAME_PREFIXES = [
        self::TYPE_CR => 'CR',
        self::TYPE_VAT => 'VAT',
        self::TYPE_UNIFIED => 'UNIFIED',
        self::TYPE_LICENSE => 'BUSINESS-LICENSE',
        self::TYPE_NATIONAL_ADDRESS => 'NATIONAL-ADDRESS',
        self::TYPE_BANK_LETTER => 'BANK-LETTER',
        self::TYPE_COMPANY_PROFILE => 'COMPANY-PROFILE',
        self::TYPE_ISO => 'ISO',
        self::TYPE_CREDIT_APPLICATION => 'CREDIT-APPLICATION',
        self::TYPE_OTHER => 'OTHER',
    ];

    protected $table = 'supplier_documents';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = true;

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'supplier_id',
        'document_type',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'version',
        'is_current',
        'expiry_date',
        'is_mandatory',
        'uploaded_by_user_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
            'expiry_date' => 'date',
            'file_size' => 'integer',
            'version' => 'integer',
            'is_current' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date !== null && $this->expiry_date->isPast();
    }

    public function isExpiringSoon(): bool
    {
        if ($this->expiry_date === null || $this->isExpired()) {
            return false;
        }
        return $this->expiry_date->diffInDays(now()) <= 30;
    }

    /** @return array<int, string> */
    public static function allowedTypes(): array
    {
        return array_keys(self::FILE_NAME_PREFIXES);
    }

    public static function fileNamePrefix(string $documentType): string
    {
        return self::FILE_NAME_PREFIXES[$documentType]
            ?? Str::upper(Str::slug($documentType, '-'));
    }

    public static function isMandatoryType(string $documentType): bool
    {
        return in_array($documentType, static::MANDATORY_TYPES, true);
    }

    public static function supplierExpiryField(string $documentType): ?string
    {
        return match ($documentType) {
            self::TYPE_CR => 'cr_expiry_date',
            self::TYPE_VAT => 'vat_expiry_date',
            self::TYPE_LICENSE => 'license_expiry_date',
            default => null,
        };
    }

    /** @return array<string, array{field: string}> */
    public static function linkedExpiryFieldMap(): array
    {
        $links = [];

        foreach (static::allowedTypes() as $documentType) {
            $field = static::supplierExpiryField($documentType);

            if ($field === null) {
                continue;
            }

            $links[$documentType] = ['field' => $field];
        }

        return $links;
    }

    public static function resolveExpiryDateForSupplier(
        Supplier $supplier,
        string $documentType,
        mixed $storedExpiry = null,
    ): ?string {
        $supplierField = static::supplierExpiryField($documentType);
        $supplierExpiry = $supplierField ? $supplier->{$supplierField} ?? null : null;

        return static::normalizeExpiryDate($supplierExpiry)
            ?? static::normalizeExpiryDate($storedExpiry);
    }

    public static function remainingDaysForExpiry(?string $expiryDate): ?int
    {
        if (! $expiryDate) {
            return null;
        }

        return (int) round(
            Carbon::now()
                ->startOfDay()
                ->diffInDays(Carbon::parse($expiryDate)->startOfDay(), false),
        );
    }

    public static function expiryStatusForDate(?string $expiryDate): string
    {
        $remainingDays = static::remainingDaysForExpiry($expiryDate);

        if ($remainingDays === null) {
            return 'no_expiry';
        }

        if ($remainingDays < 0) {
            return 'expired';
        }

        if ($remainingDays <= 30) {
            return 'expiring_soon';
        }

        return 'valid';
    }

    /** @param array<string, mixed> $document */
    public static function presentForSupplier(
        Supplier $supplier,
        array $document,
        ?string $host = null,
    ): array {
        $documentType = (string) ($document['document_type'] ?? '');
        $filePath = is_string($document['file_path'] ?? null)
            ? $document['file_path']
            : null;
        $resolvedExpiry = static::resolveExpiryDateForSupplier(
            $supplier,
            $documentType,
            $document['expiry_date'] ?? null,
        );

        $presented = array_merge($document, [
            'expiry_date' => $resolvedExpiry,
            'remaining_days' => static::remainingDaysForExpiry($resolvedExpiry),
            'expiry_status' => static::expiryStatusForDate($resolvedExpiry),
            'is_mandatory' => static::isMandatoryType($documentType),
            'source' => static::sourceForSupplier($supplier, $document),
        ]);

        if ($host !== null && $filePath !== null) {
            $storageUrl = rtrim($host, '/') . '/storage/' . ltrim($filePath, '/');
            $presented['preview_url'] = $storageUrl;
            $presented['download_url'] = $storageUrl;
        }

        return $presented;
    }

    public static function nextVersionForSupplier(string $supplierId, string $documentType): int
    {
        $maxVersion = (int) static::query()
            ->where('supplier_id', $supplierId)
            ->where('document_type', $documentType)
            ->max('version');

        return $maxVersion > 0 ? $maxVersion + 1 : 1;
    }

    public static function buildVersionedFileName(
        string $documentType,
        int $version,
        ?string $sourceName = null,
        ?string $fallbackPath = null,
    ): string {
        $extension = strtolower((string) pathinfo((string) $sourceName, PATHINFO_EXTENSION));

        if ($extension === '') {
            $extension = strtolower((string) pathinfo((string) $fallbackPath, PATHINFO_EXTENSION));
        }

        if ($extension === '') {
            return sprintf('%s-V%d', static::fileNamePrefix($documentType), $version);
        }

        return sprintf('%s-V%d.%s', static::fileNamePrefix($documentType), $version, $extension);
    }

    /** @param array<string, mixed> $attributes */
    public static function createVersionedUpload(
        Supplier $supplier,
        UploadedFile $file,
        string $documentType,
        ?int $uploadedByUserId = null,
        array $attributes = [],
    ): self {
        static::query()
            ->where('supplier_id', $supplier->id)
            ->where('document_type', $documentType)
            ->update(['is_current' => false]);

        $version = static::nextVersionForSupplier($supplier->id, $documentType);
        $fileName = static::buildVersionedFileName(
            $documentType,
            $version,
            $file->getClientOriginalName(),
            $file->hashName()
        );
        $filePath = $file->storeAs('supplier_documents/' . $supplier->id, $fileName, 'public');

        return static::create(array_merge([
            'id' => (string) Str::uuid(),
            'supplier_id' => $supplier->id,
            'uploaded_by_user_id' => $uploadedByUserId,
            'document_type' => $documentType,
            'is_mandatory' => static::isMandatoryType($documentType),
            'file_name' => $fileName,
            'file_path' => $filePath,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'version' => $version,
            'is_current' => true,
        ], $attributes));
    }

    /** @param array<string, mixed> $attributes */
    public static function createVersionedRecord(
        Supplier $supplier,
        string $documentType,
        string $filePath,
        ?int $uploadedByUserId = null,
        array $attributes = [],
        ?string $sourceName = null,
    ): self {
        static::query()
            ->where('supplier_id', $supplier->id)
            ->where('document_type', $documentType)
            ->update(['is_current' => false]);

        $version = static::nextVersionForSupplier($supplier->id, $documentType);
        $fileName = $attributes['file_name'] ?? static::buildVersionedFileName(
            $documentType,
            $version,
            $sourceName,
            $filePath,
        );

        return static::create(array_merge([
            'id' => (string) Str::uuid(),
            'supplier_id' => $supplier->id,
            'uploaded_by_user_id' => $uploadedByUserId,
            'document_type' => $documentType,
            'is_mandatory' => static::isMandatoryType($documentType),
            'file_name' => $fileName,
            'file_path' => $filePath,
            'version' => $version,
            'is_current' => true,
        ], $attributes));
    }

    private static function normalizeExpiryDate(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->toDateString();
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param array<string, mixed> $document */
    private static function sourceForSupplier(Supplier $supplier, array $document): ?string
    {
        $normalizedSource = static::normalizeSourceKey($document['source'] ?? null);

        if ($normalizedSource !== null) {
            return $normalizedSource;
        }

        $uploadedByUserId = $document['uploaded_by_user_id'] ?? null;

        if (
            $supplier->supplier_user_id !== null
            && $uploadedByUserId !== null
            && (string) $uploadedByUserId === (string) $supplier->supplier_user_id
        ) {
            return 'supplier';
        }

        $roleNames = static::extractUploaderRoleNames($document);

        if (in_array(User::ROLE_SUPPLIER, $roleNames, true)) {
            return 'supplier';
        }

        if (
            in_array('procurement_manager', $roleNames, true)
            || in_array('procurement_officer', $roleNames, true)
        ) {
            return 'procurement';
        }

        if (in_array('super_admin', $roleNames, true) || in_array('admin', $roleNames, true)) {
            return 'admin';
        }

        return null;
    }

    private static function normalizeSourceKey(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return match (trim($value)) {
            'supplier' => 'supplier',
            'admin', 'super_admin' => 'admin',
            'procurement', 'procurement_manager', 'procurement_officer' => 'procurement',
            default => null,
        };
    }

    /** @param array<string, mixed> $document
     *  @return array<int, string>
     */
    private static function extractUploaderRoleNames(array $document): array
    {
        $uploader = $document['uploader'] ?? null;

        if (! is_array($uploader)) {
            return [];
        }

        $roles = $uploader['roles'] ?? null;

        if (! is_array($roles)) {
            return [];
        }

        return collect($roles)
            ->map(fn (mixed $role): ?string => is_array($role) && is_string($role['name'] ?? null)
                ? $role['name']
                : null)
            ->filter(fn (?string $roleName): bool => $roleName !== null && $roleName !== '')
            ->values()
            ->all();
    }
}
