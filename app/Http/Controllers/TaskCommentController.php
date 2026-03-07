<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class TaskCommentController extends Controller
{
    public function store(Request $request, Task $task): RedirectResponse
    {
        $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        TaskComment::create([
            'id' => (string) Str::uuid(),
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'body' => $request->input('body'),
        ]);

        return redirect()->back()->with('success', 'Comment added.');
    }

    public function destroy(Request $request, Task $task, TaskComment $comment): RedirectResponse
    {
        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        if ($comment->user_id !== $request->user()->id && ! $request->user()->can('tasks.delete')) {
            abort(403);
        }

        $comment->delete();

        return redirect()->back()->with('success', 'Comment deleted.');
    }
}
