<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class SupplierContact extends Model implements HasMedia
{
    use InteractsWithMedia, SoftDeletes;

    public const TYPE_SALES = 'sales';

    public const TYPE_TECHNICAL = 'technical';

    public const TYPE_FINANCE = 'finance';

    public const TYPE_CONTRACTS = 'contracts';

    public const TYPE_MANAGEMENT = 'management';

    protected $table = 'supplier_contacts';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'supplier_id',
        'name',
        'job_title',
        'department',
        'contact_type',
        'email',
        'phone',
        'mobile',
        'is_primary',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')->singleFile();
        $this->addMediaCollection('business_card_front')->singleFile();
        $this->addMediaCollection('business_card_back')->singleFile();
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->performOnCollections('avatar')
            ->width(100)
            ->height(100)
            ->format('webp')
            ->optimize();

        $this->addMediaConversion('preview')
            ->performOnCollections('avatar')
            ->width(300)
            ->height(300)
            ->format('webp')
            ->optimize();

        $this->addMediaConversion('card_preview')
            ->performOnCollections('business_card_front', 'business_card_back')
            ->width(600)
            ->format('webp')
            ->optimize();
    }
}
