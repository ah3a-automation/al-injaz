<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoqImportJob extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_RUNNING = 'running';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $table = 'boq_import_jobs';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'project_id',
        'status',
        'progress',
        'rows_total',
        'rows_processed',
        'file_path',
        'error_file_path',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'id'             => 'string',
            'project_id'     => 'string',
            'progress'       => 'integer',
            'rows_total'     => 'integer',
            'rows_processed' => 'integer',
            'started_at'     => 'datetime',
            'finished_at'    => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
