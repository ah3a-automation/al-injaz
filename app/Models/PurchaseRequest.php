<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class PurchaseRequest extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'project_id',
        'package_id',
        'pr_number',
        'title_ar',
        'title_en',
        'description',
        'status',
        'priority',
        'requested_by',
        'reviewed_by',
        'approved_by',
        'approved_at',
        'rejected_reason',
        'needed_by_date',
        'converted_to_rfq_id',
        'erp_reference_id',
    ];

    protected function casts(): array
    {
        return [
            'id'                  => 'string',
            'project_id'          => 'string',
            'package_id'          => 'string',
            'converted_to_rfq_id' => 'string',
            'approved_at'         => 'datetime',
            'needed_by_date'      => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProjectPackage::class, 'package_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseRequestItem::class);
    }

    /**
     * Generate the next PR number for the current year.
     * Format: PR-{YYYY}-{sequence:04d}
     * Must be called inside a DB::transaction() to make lockForUpdate() effective.
     */
    public static function generatePrNumber(): string
    {
        $year   = now()->format('Y');
        $prefix = "PR-{$year}-";

        $max = DB::table('purchase_requests')
            ->where('pr_number', 'like', $prefix . '%')
            ->lockForUpdate()
            ->selectRaw('MAX(pr_number) as max_number')
            ->value('max_number');

        $next = $max === null
            ? 1
            : ((int) substr($max, strlen($prefix))) + 1;

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
