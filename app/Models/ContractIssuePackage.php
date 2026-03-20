<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractIssuePackage extends Model
{
    use HasUuids;

    public const PACKAGE_STATUS_ISSUED = 'issued';

    public const PACKAGE_STATUS_SUPERSEDED = 'superseded';

    protected $table = 'contract_issue_packages';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'contract_id',
        'issue_version',
        'package_status',
        'prepared_by_user_id',
        'prepared_at',
        'notes',
        'snapshot_contract_status',
        'snapshot_contract_title_en',
        'snapshot_contract_title_ar',
        'snapshot_supplier_name',
        'snapshot_contract_number',
        'snapshot_article_count',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'prepared_at' => 'datetime',
        ];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }
}

