<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractGeneratedDocument extends Model
{
    use HasUuids;

    public const TYPE_CONTRACT_DOCX = 'contract_docx';

    public const TYPE_CONTRACT_PDF = 'contract_pdf';

    public const TYPE_SIGNATURE_PACKAGE_DOCX = 'signature_package_docx';

    public const TYPE_SIGNATURE_PACKAGE_PDF = 'signature_package_pdf';

    /** @var array<string> */
    public const TYPES = [
        self::TYPE_CONTRACT_DOCX,
        self::TYPE_CONTRACT_PDF,
        self::TYPE_SIGNATURE_PACKAGE_DOCX,
        self::TYPE_SIGNATURE_PACKAGE_PDF,
    ];

    public const SOURCE_DRAFT = 'draft';

    public const SOURCE_SIGNATURE_PACKAGE = 'signature_package';

    /** @var array<string> */
    public const SOURCES = [
        self::SOURCE_DRAFT,
        self::SOURCE_SIGNATURE_PACKAGE,
    ];

    protected $table = 'contract_generated_documents';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'contract_issue_package_id',
        'document_type',
        'file_name',
        'file_path',
        'mime_type',
        'file_size_bytes',
        'generation_source',
        'snapshot_contract_status',
        'snapshot_issue_version',
        'generated_by_user_id',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'contract_id' => 'string',
            'contract_issue_package_id' => 'string',
            'generated_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function issuePackage(): BelongsTo
    {
        return $this->belongsTo(ContractIssuePackage::class, 'contract_issue_package_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user_id');
    }
}
