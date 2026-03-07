<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoqImportMapping extends Model
{
    protected $table = 'boq_import_mappings';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'mapping_json',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'mapping_json' => 'array',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
