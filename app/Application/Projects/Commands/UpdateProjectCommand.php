<?php

declare(strict_types=1);

namespace App\Application\Projects\Commands;

use App\Application\Projects\DTOs\UpdateProjectDTO;
use App\Events\Projects\ProjectUpdated;
use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;

final class UpdateProjectCommand
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    public function execute(Project $project, UpdateProjectDTO $dto, User $actor): Project
    {
        $oldValues = $project->toArray();

        DB::transaction(function () use ($project, $dto) {
            $project->update(array_filter([
                'name' => $dto->name,
                'description' => $dto->description,
                'status' => $dto->status,
                'start_date' => $dto->startDate,
                'end_date' => $dto->endDate,
                'code' => $dto->code,
                'name_en' => $dto->nameEn,
                'name_ar' => $dto->nameAr,
                'client' => $dto->client,
                'currency' => $dto->currency,
                'contract_value' => $dto->contractValue,
                'planned_margin_pct' => $dto->plannedMarginPct,
                'min_margin_pct' => $dto->minMarginPct,
            ], fn ($v) => $v !== null));
        });

        DB::afterCommit(function () use ($project, $oldValues, $actor) {
            event(new ProjectUpdated([
                'id' => $project->id,
                'old_values' => $oldValues,
                'new_values' => $project->fresh()->toArray(),
                'updated_by' => $actor->id,
            ]));
            $this->activityLogger->log(
                'projects.project.updated',
                $project,
                $oldValues,
                $project->fresh()->toArray(),
                $actor
            );
        });

        return $project->fresh();
    }
}
