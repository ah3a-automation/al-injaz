<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoqItemDocument extends Model
{
    protected $table = 'boq_item_documents';

    protected $keyType = 'string';

    public $incrementing = false;

    public const UPDATED_AT = null;

    protected $fillable = [
        'boq_item_id',
        'title',
        'file_path',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'id'          => 'string',
            'boq_item_id' => 'string',
        ];
    }

    public function boqItem(): BelongsTo
    {
        return $this->belongsTo(ProjectBoqItem::class, 'boq_item_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
