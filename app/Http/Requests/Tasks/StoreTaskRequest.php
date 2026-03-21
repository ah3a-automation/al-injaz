<?php

declare(strict_types=1);

namespace App\Http\Requests\Tasks;

use App\Models\TaskLink;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tasks.create') ?? false;
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
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'reminder_at' => ['nullable', 'date'],
            'links' => ['nullable', 'array', 'max:20'],
            'links.*.type' => ['required_with:links', 'string', 'in:project,supplier,rfq,package,contract,purchase_request'],
            'links.*.id' => ['required_with:links.*.type', 'string'],
            'assignees' => ['nullable', 'array'],
            'assignees.*.user_id' => ['required', 'exists:users,id'],
            'assignees.*.role' => ['required', 'string', 'in:responsible,reviewer,watcher'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            $links = $this->input('links');
            if (! is_array($links)) {
                return;
            }
            foreach ($links as $i => $link) {
                if (! is_array($link) || ! isset($link['type'], $link['id'])) {
                    continue;
                }
                if (! TaskLink::linkExists((string) $link['type'], (string) $link['id'])) {
                    $validator->errors()->add(
                        "links.{$i}.id",
                        __('tasks.link_entity_not_found')
                    );
                }
            }
        });
    }
}
