<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

final class TaskLink extends Model
{
    public const ALLOWED_TYPES = [
        'project' => Project::class,
        'supplier' => Supplier::class,
        'rfq' => Rfq::class,
        'package' => ProcurementPackage::class,
        'contract' => Contract::class,
        'purchase_request' => PurchaseRequest::class,
    ];

    public $timestamps = false;

    protected $table = 'task_links';

    protected $fillable = [
        'task_id',
        'linkable_type',
        'linkable_id',
        'created_by_user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (TaskLink $link): void {
            if ($link->created_at === null) {
                $link->created_at = now();
            }
        });
    }

    public static function resolveClass(string $typeKey): string
    {
        if (! isset(self::ALLOWED_TYPES[$typeKey])) {
            throw new \InvalidArgumentException('Invalid task link type: ' . $typeKey);
        }

        return self::ALLOWED_TYPES[$typeKey];
    }

    public static function linkExists(string $typeKey, string $id): bool
    {
        $class = self::resolveClass($typeKey);

        return $class::query()->whereKey($id)->exists();
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function linkable(): MorphTo
    {
        return $this->morphTo(name: 'linkable', type: 'linkable_type', id: 'linkable_id');
    }
}
