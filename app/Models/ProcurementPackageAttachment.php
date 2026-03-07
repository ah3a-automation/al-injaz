<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementPackageAttachment extends Model
{
    use HasUuids;

    protected $table = 'procurement_package_attachments';

    protected $keyType = 'string';

    public $incrementing = false;

    public const SOURCE_UPLOAD = 'upload';

    public const SOURCE_GOOGLE_DRIVE = 'google_drive';

    public const SOURCE_DROPBOX = 'dropbox';

    public const SOURCE_ONEDRIVE = 'onedrive';

    public const SOURCE_WETRANSFER = 'wetransfer';

    public const SOURCE_OTHER_LINK = 'other_link';

    public const DOCUMENT_SPECIFICATIONS = 'specifications';

    public const DOCUMENT_DRAWINGS = 'drawings';

    public const DOCUMENT_BOQ = 'boq';

    public const DOCUMENT_OTHER = 'other';

    protected $fillable = [
        'package_id',
        'document_type',
        'source_type',
        'title',
        'file_path',
        'external_url',
        'external_provider',
        'file_size_bytes',
        'mime_type',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'id'         => 'string',
            'package_id' => 'string',
        ];
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProcurementPackage::class, 'package_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
