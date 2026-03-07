<?php

declare(strict_types=1);

namespace App\Application\Projects\Commands;

use App\Events\Projects\ProjectDeleted;
use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;

final class DeleteProjectCommand
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    public function execute(Project $project, User $actor): void
    {
        $payload = ['id' => $project->id, 'name' => $project->name];

        DB::transaction(function () use ($project) {
            $project->delete();
        });

        DB::afterCommit(function () use ($project, $payload, $actor) {
            event(new ProjectDeleted([
                ...$payload,
                'deleted_at' => now()->toISOString(),
                'deleted_by' => $actor->id,
            ]));
            $this->activityLogger->log(
                'projects.project.deleted',
                $project,
                $payload,
                [],
                $actor
            );
        });
    }
}
