<?php

declare(strict_types=1);

namespace App\Application\Projects\Commands;

use App\Application\Projects\DTOs\CreateProjectDTO;
use App\Events\Projects\ProjectCreated;
use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateProjectCommand
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    public function execute(CreateProjectDTO $dto, User $actor): Project
    {
        /** @var Project|null $project */
        $project = null;

        DB::transaction(function () use ($dto, $actor, &$project) {
            $project = Project::create([
                'id'                 => (string) Str::uuid(),
                'name'               => $dto->name,
                'description'        => $dto->description,
                'status'             => $dto->status,
                'start_date'         => $dto->startDate,
                'end_date'           => $dto->endDate,
                'owner_user_id'      => $actor->id,
                'code'               => $dto->code,
                'name_ar'            => $dto->nameAr,
                'client'             => $dto->client,
                'currency'           => $dto->currency,
                'contract_value'     => $dto->contractValue,
                'planned_margin_pct' => $dto->plannedMarginPct,
                'min_margin_pct'     => $dto->minMarginPct,
            ]);
        });

        DB::afterCommit(function () use ($project, $actor) {
            // $project->id is now known immediately — no refresh needed
            event(new ProjectCreated([
                'id'            => $project->id,
                'name'          => $project->name,
                'owner_user_id' => $project->owner_user_id,
                'created_at'    => $project->created_at,
            ]));
            $this->activityLogger->log(
                'projects.project.created',
                $project,
                [],
                $project->toArray(),
                $actor
            );
        });

        return $project;
    }
}