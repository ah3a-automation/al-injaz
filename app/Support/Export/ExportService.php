<?php

declare(strict_types=1);

namespace App\Support\Export;

use App\Models\Export;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\Export\Contracts\Exportable;
use Illuminate\Support\Str;
use App\Jobs\ProcessExportJob;


class ExportService
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    public function dispatch(
        string $exportableClass,
        string $format,
        array $filters,
        User $user
    ): Export {
        $export = Export::create([
            'id'      => (string) Str::uuid(),
            'user_id' => $user->id,
            'type'    => app($exportableClass)->getType(),
            'format'  => $format,
            'status'  => Export::STATUS_PENDING,
            'filters' => $filters,
        ]);

        ProcessExportJob::dispatch($export->id, $exportableClass)->onQueue('exports');

        $this->activityLogger->log('exports.export.requested', $export, [], [], $user);

        return $export;
    }
}
