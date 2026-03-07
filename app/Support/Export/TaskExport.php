<?php

declare(strict_types=1);

namespace App\Support\Export;

use App\Models\Task;
use App\Support\Export\Contracts\Exportable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class TaskExport implements Exportable
{
    public function getType(): string
    {
        return 'tasks';
    }

    public function getTitle(): string
    {
        return 'Tasks Export';
    }

    public function getHeadings(): array
    {
        return [
            'Title',
            'Status',
            'Priority',
            'Project',
            'Creator',
            'Due Date',
            'Progress %',
            'Created At',
        ];
    }

    public function getQuery(array $filters): Builder
    {
        return Task::query()
            ->with(['creator:id,name', 'project:id,name'])
            ->when(! empty($filters['project_id']), fn ($q) => $q->where('project_id', $filters['project_id']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(! empty($filters['priority']), fn ($q) => $q->where('priority', $filters['priority']))
            ->orderBy('created_at');
    }

    public function mapRow(mixed $model): array
    {
        \assert($model instanceof Task);

        return [
            $model->title,
            $model->status,
            $model->priority,
            $model->project?->name ?? '—',
            $model->creator?->name ?? '—',
            $model->due_at?->format('Y-m-d') ?? '—',
            $model->progress_percent,
            $model->created_at?->format('Y-m-d'),
        ];
    }
}
