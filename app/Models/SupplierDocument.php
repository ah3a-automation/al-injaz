<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

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

    public const TYPE_OTHER = 'other';

    /** @var array<int, string> */
    public const MANDATORY_TYPES = [
        self::TYPE_CR,
        self::TYPE_UNIFIED,
        self::TYPE_VAT,
        self::TYPE_NATIONAL_ADDRESS,
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
}
