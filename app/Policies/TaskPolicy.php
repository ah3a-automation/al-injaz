<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class TaskPolicy extends BasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tasks.view');
    }

    public function view(User $user, Model $model): bool
    {
        if (! $user->can('tasks.view')) {
            return false;
        }
        if (! $model instanceof Task) {
            return false;
        }
        if ($user->hasRole(User::ROLE_SUPPLIER)) {
            return $model->assignees()->where('users.id', $user->id)->exists();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create');
    }

    public function update(User $user, Model $model): bool
    {
        if (! $user->can('tasks.edit')) {
            return false;
        }
        if (! $model instanceof Task) {
            return false;
        }
        if ($user->hasRole(User::ROLE_SUPPLIER)) {
            return $model->assignees()->where('users.id', $user->id)->exists();
        }

        return true;
    }

    public function delete(User $user, Model $model): bool
    {
        if (! $user->can('tasks.delete')) {
            return false;
        }
        if (! $model instanceof Task) {
            return false;
        }
        if ($user->hasRole(User::ROLE_SUPPLIER)) {
            return $model->assignees()->where('users.id', $user->id)->exists();
        }

        return true;
    }

    public function manageLinks(User $user, Task $task): bool
    {
        return $this->update($user, $task);
    }

    public function manageReminders(User $user, Task $task): bool
    {
        return $this->update($user, $task);
    }

    public function manageMedia(User $user, Task $task): bool
    {
        return $this->update($user, $task);
    }

    public function deleteComment(User $user, Task $task, TaskComment $comment): bool
    {
        if ($comment->task_id !== $task->id) {
            return false;
        }
        if ($comment->user_id === $user->id) {
            return $this->view($user, $task);
        }

        return $user->can('tasks.delete') && $this->view($user, $task);
    }
}
