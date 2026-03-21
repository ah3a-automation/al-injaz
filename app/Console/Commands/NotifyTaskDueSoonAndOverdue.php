<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskReminder;
use App\Models\User;
use App\Models\SystemSetting;
use App\Notifications\TaskCommentDueNotification;
use App\Notifications\TaskReminderNotification;
use App\Notifications\TaskSystemReminderNotification;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\System\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

final class NotifyTaskDueSoonAndOverdue extends Command
{
    protected $signature = 'tasks:notify-due-soon-overdue';

    protected $description = 'Notify task assignees about due soon and overdue tasks.';

    public function handle(
        NotificationEngineBridge $notificationEngineBridge,
        NotificationService $notificationService
    ): void {
        // Phase 6.5 precedence:
        // 1) DB setting `task_due_soon_warning_days`
        // 2) env fallback `TASK_DUE_SOON_WARNING_DAYS`
        // 3) hard fallback default: 7
        $envDefault = (int) env('TASK_DUE_SOON_WARNING_DAYS', '7');
        if ($envDefault < 1) {
            $envDefault = 7;
        }

        $warningDays = (int) SystemSetting::get('task_due_soon_warning_days', $envDefault);
        if ($warningDays < 1) {
            $warningDays = $envDefault;
        }

        $overdueRemindersEnabled = SystemSetting::get(
            'task_overdue_reminders_enabled',
            (string) env('TASK_OVERDUE_REMINDERS_ENABLED', '1')
        ) === '1';

        $today = Carbon::today();
        $warnDate = $today->copy()->addDays($warningDays);

        $dueSoonTasks = Task::query()
            ->with(['assignees', 'project'])
            ->whereNotNull('due_at')
            ->where('due_at', '>=', $today->toDateTimeString())
            ->where('due_at', '<=', $warnDate->toDateTimeString())
            ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED])
            ->get();

        $dueSoonSummary = $this->dispatchForTasks(
            tasks: $dueSoonTasks,
            eventKey: 'task.due_soon',
            today: $today,
            notificationEngineBridge: $notificationEngineBridge,
            notificationService: $notificationService
        );

        if ($overdueRemindersEnabled) {
            $overdueTasks = Task::query()
                ->with(['assignees', 'project'])
                ->whereNotNull('due_at')
                ->where('due_at', '<', $today->toDateTimeString())
                ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED])
                ->get();

            $overdueSummary = $this->dispatchForTasks(
                tasks: $overdueTasks,
                eventKey: 'task.overdue',
                today: $today,
                notificationEngineBridge: $notificationEngineBridge,
                notificationService: $notificationService
            );
        } else {
            $overdueCandidatesCount = Task::query()
                ->whereNotNull('due_at')
                ->where('due_at', '<', $today->toDateTimeString())
                ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED])
                ->count();

            $overdueSummary = [
                'attempted' => 0,
                'dispatched' => 0,
                'skipped' => 0,
                'skipped_no_assignees' => 0,
                'legacy_dispatched' => 0,
                'engine_dispatched' => 0,
                'skipped_by_status' => [],
                'operational_skip' => true,
                'operational_skipped_candidates' => $overdueCandidatesCount,
            ];
        }

        if ($this->output !== null) {
            $this->info(sprintf(
                'Task reminders run: due-soon attempted=%d dispatched=%d skipped=%d (no-assignees=%d) | overdue attempted=%d dispatched=%d skipped=%d (no-assignees=%d)',
                $dueSoonSummary['attempted'],
                $dueSoonSummary['dispatched'],
                $dueSoonSummary['skipped'],
                $dueSoonSummary['skipped_no_assignees'],
                $overdueSummary['attempted'],
                $overdueSummary['dispatched'],
                $overdueSummary['skipped'],
                $overdueSummary['skipped_no_assignees'] ?? 0
            ));
        }

        logger()->info('NotifyTaskDueSoonAndOverdue: reminder run summary', [
            'due_soon' => [
                'attempted' => $dueSoonSummary['attempted'],
                'dispatched' => $dueSoonSummary['dispatched'],
                'skipped' => $dueSoonSummary['skipped'],
                'skipped_no_assignees' => $dueSoonSummary['skipped_no_assignees'],
                'legacy_dispatched' => $dueSoonSummary['legacy_dispatched'],
                'engine_dispatched' => $dueSoonSummary['engine_dispatched'],
            ],
            'overdue' => [
                'attempted' => $overdueSummary['attempted'],
                'dispatched' => $overdueSummary['dispatched'],
                'skipped' => $overdueSummary['skipped'],
                'legacy_dispatched' => $overdueSummary['legacy_dispatched'] ?? 0,
                'engine_dispatched' => $overdueSummary['engine_dispatched'] ?? 0,
                'operational_skip' => $overdueSummary['operational_skip'] ?? false,
            ],
        ]);

        if (($overdueSummary['operational_skip'] ?? false) === true) {
            if ($this->output !== null) {
                $this->info(sprintf(
                    'Overdue reminders are disabled; skipped dispatch for %d overdue candidate task(s).',
                    (int) ($overdueSummary['operational_skipped_candidates'] ?? 0)
                ));
            }

            logger()->info('NotifyTaskDueSoonAndOverdue: operationally skipped overdue reminders', [
                'overdue_candidates' => $overdueSummary['operational_skipped_candidates'] ?? 0,
            ]);
        }

        $taskReminderRows = TaskReminder::query()->pending()->with(['task', 'user'])->get();
        foreach ($taskReminderRows as $reminder) {
            $task = $reminder->task;
            if ($task === null || $reminder->user === null) {
                $reminder->update(['is_sent' => true, 'sent_at' => now()]);

                continue;
            }
            $reminder->user->notify(new TaskReminderNotification($reminder, $task));
            $reminder->update(['is_sent' => true, 'sent_at' => now()]);
        }

        $systemReminderTasks = Task::query()
            ->whereNotNull('reminder_at')
            ->where('reminder_at', '<=', now())
            ->whereNotIn('status', [Task::STATUS_DONE, Task::STATUS_CANCELLED])
            ->with('assignees')
            ->get();
        foreach ($systemReminderTasks as $task) {
            $assignees = $task->assignees;
            if ($assignees === null || $assignees->isEmpty()) {
                $task->update(['reminder_at' => null]);

                continue;
            }
            foreach ($assignees as $assignee) {
                $assignee->notify(new TaskSystemReminderNotification($task));
            }
            $task->update(['reminder_at' => null]);
        }

        $commentReminderRows = TaskComment::query()
            ->whereNotNull('reminder_at')
            ->where('reminder_at', '<=', now())
            ->with(['task', 'user'])
            ->get();
        foreach ($commentReminderRows as $comment) {
            $task = $comment->task;
            $author = $comment->user;
            if ($task === null || $author === null) {
                $comment->update(['reminder_at' => null]);

                continue;
            }
            $author->notify(new TaskCommentDueNotification($comment, $task));
            $comment->update(['reminder_at' => null]);
        }
    }

    /**
     * @param Collection<int, Task> $tasks
     */
    private function dispatchForTasks(
        Collection $tasks,
        string $eventKey,
        Carbon $today,
        NotificationEngineBridge $notificationEngineBridge,
        NotificationService $notificationService
    ): array {
        $summary = [
            'attempted' => 0,
            'dispatched' => 0,
            'skipped' => 0,
            'skipped_no_assignees' => 0,
            'legacy_dispatched' => 0,
            'engine_dispatched' => 0,
            'skipped_by_status' => [],
        ];

        foreach ($tasks as $task) {
            /** @var Collection<int, User> $assignees */
            $assignees = $task->assignees;
            if ($assignees === null || $assignees->isEmpty()) {
                $summary['skipped_no_assignees']++;
                continue;
            }

            // Internal audience excludes actor concept (scheduled job), so we notify all assignees.
            $assignedUserIds = $assignees->pluck('id')->toArray();

            $daysLeft = (int) $today->diffInDays($task->due_at, false);
            $link = '/tasks/' . $task->id;

            if ($eventKey === 'task.due_soon') {
                $title = 'Task due soon: ' . $task->title;
                $message = $daysLeft === 0
                    ? 'Task is due today.'
                    : sprintf('Task is due in %d days.', max(0, $daysLeft));
            } else {
                $title = 'Task overdue: ' . $task->title;
                $message = sprintf('Task is overdue by %d day(s).', abs($daysLeft));
            }

            $metadata = [
                'task_id' => (string) $task->id,
            ];
            if ($task->project?->id !== null) {
                $metadata['project_id'] = (string) $task->project->id;
            }

            $context = new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => $metadata,
                'assigned_user_ids' => $assignedUserIds,
            ]);

            $summary['attempted']++;

            $result = $notificationEngineBridge->dispatchOrLegacyWithResult(
                $eventKey,
                $context,
                legacyDispatch: function () use ($notificationService, $assignees, $eventKey, $title, $message, $link, $metadata): void {
                    $notificationService->notifyUsers(
                        users: $assignees,
                        eventKey: $eventKey,
                        title: $title,
                        message: $message,
                        link: $link,
                        metadata: $metadata
                    );
                }
            );

            if ($result->dispatched) {
                $summary['dispatched']++;

                if (in_array('legacy', $result->executedChannels, true)) {
                    $summary['legacy_dispatched']++;
                } else {
                    $summary['engine_dispatched']++;
                }
            } else {
                $summary['skipped']++;
                $status = $result->status;
                $summary['skipped_by_status'][$status] = ($summary['skipped_by_status'][$status] ?? 0) + 1;
            }
        }

        $topSkips = collect($summary['skipped_by_status'])
            ->sortDesc()
            ->take(3)
            ->toArray();

        if ($summary['skipped'] > 0 && $topSkips !== []) {
            logger()->info('NotifyTaskDueSoonAndOverdue: reminder skip breakdown', [
                'event_key' => $eventKey,
                'attempted' => $summary['attempted'],
                'skipped' => $summary['skipped'],
                'top_skipped_statuses' => $topSkips,
            ]);
        }

        return $summary;
    }
}

