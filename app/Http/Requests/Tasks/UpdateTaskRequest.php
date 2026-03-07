<?php

declare(strict_types=1);

namespace App\Http\Requests\Tasks;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tasks.edit', $this->route('task')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:500'],
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'parent_task_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:backlog,open,in_progress,review,done,cancelled'],
            'priority' => ['nullable', 'string', 'in:low,normal,high,urgent'],
            'due_at' => ['nullable', 'date'],
            'start_at' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'progress_percent' => ['nullable', 'integer', 'between:0,100'],
            'visibility' => ['nullable', 'string', 'in:is_private,team,project'],
            'source' => ['nullable', 'string', 'in:manual,rfq,contract,system'],
            'assignees' => ['nullable', 'array'],
            'assignees.*.user_id' => ['required', 'exists:users,id'],
            'assignees.*.role' => ['required', 'string', 'in:responsible,reviewer,watcher'],
        ];
    }
}
