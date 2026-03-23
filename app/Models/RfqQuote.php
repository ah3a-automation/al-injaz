<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class RfqQuote extends Model implements HasMedia
{
    use HasUuids, InteractsWithMedia;

    protected $table = 'rfq_quotes';

    protected $keyType = 'string';

    public $incrementing = false;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_REVISED = 'revised';

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'submitted_at',
        'status',
        'draft_saved_at',
        'draft_data',
    ];

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'rfq_id'         => 'string',
            'supplier_id'    => 'string',
            'submitted_at'   => 'datetime',
            'draft_saved_at' => 'datetime',
            'draft_data'     => 'array',
        ];
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RfqQuoteItem::class, 'rfq_quote_id');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments');
    }
}
