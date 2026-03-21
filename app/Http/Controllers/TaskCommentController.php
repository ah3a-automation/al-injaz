<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use App\Services\ActivityLogger;
use App\Services\MediaManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class TaskCommentController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly MediaManager $mediaManager,
    ) {}

    public function store(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'reminder_at' => ['nullable', 'date'],
            'files' => ['nullable', 'array', 'max:10'],
            'files.*' => ['file', 'max:20480'],
        ]);

        $commentId = (string) Str::uuid();

        DB::transaction(function () use ($validated, $task, $request, $commentId): void {
            $comment = TaskComment::create([
                'id' => $commentId,
                'task_id' => $task->id,
                'user_id' => $request->user()->id,
                'body' => $validated['body'],
                'reminder_at' => $validated['reminder_at'] ?? null,
            ]);

            $files = $request->file('files', []);
            foreach ($files as $file) {
                if ($file !== null) {
                    $this->mediaManager->attachToModel($comment, $file, 'comment_files', false);
                }
            }
        });

        $this->activityLogger->log(
            'tasks.comment.added',
            $task->fresh(),
            [],
            ['comment_id' => $commentId],
            $request->user()
        );

        return redirect()->back()->with('success', __('tasks.flash_comment_added'));
    }

    public function destroy(Request $request, Task $task, TaskComment $comment): RedirectResponse
    {
        $this->authorize('deleteComment', [$task, $comment]);

        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        $commentId = $comment->id;

        DB::transaction(function () use ($comment): void {
            $comment->clearMediaCollection('comment_files');
            $comment->delete();
        });

        $this->activityLogger->log(
            'tasks.comment.deleted',
            $task,
            ['comment_id' => $commentId],
            [],
            $request->user()
        );

        return redirect()->back()->with('success', __('tasks.flash_comment_deleted'));
    }

    public function storeMedia(Request $request, Task $task, TaskComment $comment): RedirectResponse
    {
        $this->authorize('update', $task);

        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $file = $request->file('file');
        $media = $this->mediaManager->attachToModel($comment, $file, 'comment_files', false);

        $this->activityLogger->log(
            'tasks.attachment.added',
            $task->fresh(),
            [],
            [
                'file_name' => $media->file_name,
                'comment_id' => $comment->id,
            ],
            $request->user()
        );

        return redirect()->back()->with('success', __('tasks.flash_comment_media_added'));
    }

    public function destroyMedia(Request $request, Task $task, TaskComment $comment, Media $media): RedirectResponse
    {
        $this->authorize('update', $task);

        if ($comment->task_id !== $task->id) {
            abort(404);
        }

        if ((string) $media->model_id !== (string) $comment->id || $media->model_type !== TaskComment::class) {
            abort(404);
        }

        $fileName = $media->file_name;
        $this->mediaManager->delete($media);

        $this->activityLogger->log(
            'tasks.attachment.removed',
            $task->fresh(),
            ['file_name' => $fileName, 'comment_id' => $comment->id],
            [],
            $request->user()
        );

        return redirect()->back()->with('success', __('tasks.flash_comment_media_removed'));
    }
}
