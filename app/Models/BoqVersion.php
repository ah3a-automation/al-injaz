<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class BoqVersion extends Model
{
    use HasUuids;

    protected $primaryKey = 'id';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'project_id',
        'version_no',
        'label',
        'status',
        'imported_by',
        'imported_at',
        'item_count',
        'total_revenue',
        'total_planned_cost',
        'diff_summary_json',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'id'                 => 'string',
            'project_id'         => 'string',
            'version_no'         => 'integer',
            'item_count'         => 'integer',
            'total_revenue'      => 'decimal:2',
            'total_planned_cost' => 'decimal:2',
            'diff_summary_json'  => 'array',
            'imported_at'        => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProjectBoqItem::class, 'boq_version_id');
    }

    public function changeLogs(): HasMany
    {
        return $this->hasMany(BoqChangeLog::class);
    }

    /**
     * Activate this version and archive all others for the same project.
     * Runs inside a transaction. Safe to call multiple times.
     */
    public function activate(): void
    {
        DB::transaction(function () {
            static::where('project_id', $this->project_id)
                ->where('id', '!=', $this->id)
                ->where('status', '!=', 'archived')
                ->update(['status' => 'archived']);

            $this->update(['status' => 'active']);
        });
    }
}
