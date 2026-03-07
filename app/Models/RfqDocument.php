<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqDocument extends Model
{
    protected $table = 'rfq_documents';
    protected $keyType = 'string';
    public $incrementing = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'rfq_id', 'document_type', 'source_type', 'title',
        'file_path', 'external_url', 'external_provider',
        'file_size_bytes', 'mime_type', 'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'id'              => 'string',
            'rfq_id'          => 'string',
            'file_size_bytes' => 'integer',
        ];
    }

    public function rfq(): BelongsTo        { return $this->belongsTo(Rfq::class); }
    public function uploadedBy(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
