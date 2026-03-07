<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Rfq extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'rfqs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'project_id', 'purchase_request_id', 'procurement_package_id', 'rfq_number', 'title',
        'description', 'status', 'version_no', 'addendum_note',
        'submission_deadline', 'validity_period_days', 'currency',
        'require_acceptance', 'created_by', 'issued_by', 'issued_at', 'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'id'                  => 'string',
            'project_id'              => 'string',
            'purchase_request_id'     => 'string',
            'procurement_package_id'  => 'string',
            'version_no'          => 'integer',
            'validity_period_days'=> 'integer',
            'submission_deadline' => 'date',
            'require_acceptance'  => 'boolean',
            'issued_at'           => 'datetime',
            'closed_at'           => 'datetime',
        ];
    }

    public function project(): BelongsTo            { return $this->belongsTo(Project::class); }
    public function purchaseRequest(): BelongsTo    { return $this->belongsTo(PurchaseRequest::class); }
    public function procurementPackage(): BelongsTo { return $this->belongsTo(ProcurementPackage::class, 'procurement_package_id'); }
    public function createdBy(): BelongsTo     { return $this->belongsTo(User::class, 'created_by'); }
    public function issuedBy(): BelongsTo      { return $this->belongsTo(User::class, 'issued_by'); }
    public function items(): HasMany           { return $this->hasMany(RfqItem::class); }
    public function suppliers(): HasMany       { return $this->hasMany(RfqSupplier::class); }
    public function documents(): HasMany       { return $this->hasMany(RfqDocument::class); }
    public function clarifications(): HasMany  { return $this->hasMany(RfqClarification::class); }
    public function quotes(): HasMany          { return $this->hasMany(SupplierQuote::class); }
    public function rfqQuotes(): HasMany      { return $this->hasMany(RfqQuote::class, 'rfq_id'); }
    public function award(): HasOne            { return $this->hasOne(RfqAward::class); }

    /**
     * Generate next RFQ number for current year. Must be called within a DB::transaction
     * so that lockForUpdate() holds until the new RFQ is inserted.
     */
    public static function generateRfqNumber(): string
    {
        $year   = now()->format('Y');
        $prefix = "RFQ-{$year}-";
        $last   = DB::table('rfqs')
            ->where('rfq_number', 'like', $prefix . '%')
            ->orderByDesc('rfq_number')
            ->lockForUpdate()
            ->value('rfq_number');
        $next = $last === null
            ? 1
            : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
