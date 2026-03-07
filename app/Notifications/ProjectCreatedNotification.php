<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;

class ProjectCreatedNotification extends BaseAppNotification
{
    /**
     * @param object $project Object with id, name
     */
    public function __construct(
        public readonly object $project,
        public readonly User $creator,
    ) {}

    protected function getEventCode(): string
    {
        return 'project.created';
    }

    /**
     * @return array<string, string|int|float|bool|null>
     */
    protected function getVariables(): array
    {
        return [
            'project_name' => $this->project->name ?? '',
            'created_by' => $this->creator->name,
        ];
    }

    protected function getLink(): ?string
    {
        return "/projects/{$this->project->id}";
    }
}
