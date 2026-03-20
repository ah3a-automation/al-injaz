<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class ProjectCreatedNotification extends BaseAppNotification
{
    /**
     * @param  Model|object  $project
     */
    public function __construct(
        public readonly object $project,
        public readonly User $creator,
    ) {}

    public function getEventCode(): string
    {
        return 'project.created';
    }

    public function getNotifiable(): ?Model
    {
        return $this->project instanceof Model ? $this->project : null;
    }

    protected function getActorUserId(): ?int
    {
        return $this->creator->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function getNotificationMetadata(): array
    {
        if ($this->project instanceof Project) {
            return ['project_id' => $this->project->id];
        }

        return isset($this->project->id) ? ['project_id' => $this->project->id] : [];
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
