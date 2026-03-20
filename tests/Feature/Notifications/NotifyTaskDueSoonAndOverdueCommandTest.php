<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Console\Commands\NotifyTaskDueSoonAndOverdue;
use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\SystemNotification;
use App\Models\SystemSetting;
use App\Models\Task;
use App\Models\User;
use App\Services\Notifications\Channels\SendEmailNotificationAction;
use App\Services\Notifications\Channels\SendInternalNotificationAction;
use App\Services\Notifications\NotificationChannelPlanner;
use App\Services\Notifications\NotificationConditionEvaluator;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEnginePilotGate;
use App\Services\Notifications\NotificationPolicyResolver;
use App\Services\Notifications\NotificationRecipientResolver;
use App\Services\System\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NotifyTaskDueSoonAndOverdueCommandTest extends TestCase
{
    use RefreshDatabase;

    private function makeBridge(): NotificationEngineBridge
    {
        $mailer = $this->app->make(Mailer::class);

        $dispatcher = new NotificationDispatcher(
            policyResolver: new NotificationPolicyResolver(),
            conditionEvaluator: new NotificationConditionEvaluator(),
            recipientResolver: new NotificationRecipientResolver(),
            channelPlanner: new NotificationChannelPlanner(),
            sendInternalAction: new SendInternalNotificationAction(new NotificationService()),
            sendEmailAction: new SendEmailNotificationAction($mailer)
        );

        return new NotificationEngineBridge(
            pilotGate: new NotificationEnginePilotGate(),
            dispatcher: $dispatcher
        );
    }

    private function seedTaskDueSoonPolicy(): void
    {
        $setting = NotificationSetting::create([
            'event_key' => 'task.due_soon',
            'name' => 'Task Due Soon',
            'description' => 'A task is due soon.',
            'module' => 'tasks',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => false,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);
    }

    private function seedTaskOverduePolicy(): void
    {
        $setting = NotificationSetting::create([
            'event_key' => 'task.overdue',
            'name' => 'Task Overdue',
            'description' => 'A task is overdue.',
            'module' => 'tasks',
            'is_enabled' => true,
            'send_internal' => true,
            'send_email' => false,
            'send_broadcast' => false,
            'send_sms' => false,
            'send_whatsapp' => false,
            'delivery_mode' => 'immediate',
            'digest_frequency' => null,
            'environment_scope' => 'all',
            'conditions_json' => [],
        ]);

        NotificationRecipient::create([
            'notification_setting_id' => $setting->id,
            'recipient_type' => 'assigned_user',
            'role_name' => null,
            'user_id' => null,
            'recipient_value' => null,
            'is_enabled' => true,
            'sort_order' => 0,
        ]);
    }

    private function createTaskWithAssigneeDueAt(User $creator, User $assignee, Carbon $dueAt): Task
    {
        $task = Task::create([
            'id' => (string) Str::uuid(),
            'project_id' => null,
            'parent_task_id' => null,
            'created_by_user_id' => $creator->id,
            'title' => 'Test Task',
            'description' => null,
            'status' => 'open',
            'priority' => 'normal',
            'due_at' => $dueAt,
            'start_at' => null,
            'completed_at' => null,
            'visibility' => 'team',
            'source' => 'manual',
            'position' => 0,
            'estimated_hours' => null,
            'actual_hours' => null,
            'progress_percent' => 0,
        ]);

        $task->assignees()->attach($assignee->id, ['role' => 'responsible']);

        return $task;
    }

    #[Test]
    public function db_setting_overrides_env_warning_days(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $this->seedTaskDueSoonPolicy();

        $creator = User::factory()->create();
        $assignee = User::factory()->create();

        // Env fallback: 7 days, but DB setting overrides it to 3.
        putenv('TASK_DUE_SOON_WARNING_DAYS=7');
        $_ENV['TASK_DUE_SOON_WARNING_DAYS'] = '7';

        SystemSetting::set('task_due_soon_warning_days', 3);

        $today = Carbon::today();
        $dueAt = $today->copy()->addDays(6)->startOfDay();

        $this->createTaskWithAssigneeDueAt($creator, $assignee, $dueAt);

        $command = new NotifyTaskDueSoonAndOverdue();
        $bridge = $this->makeBridge();

        $command->handle($bridge, new NotificationService());

        $this->assertSame(
            0,
            SystemNotification::query()
                ->where('user_id', $assignee->id)
                ->where('event_key', 'task.due_soon')
                ->count()
        );
    }

    #[Test]
    public function env_fallback_is_used_when_db_setting_missing(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.due_soon']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $this->seedTaskDueSoonPolicy();

        $creator = User::factory()->create();
        $assignee = User::factory()->create();

        // Remove DB override so env fallback applies.
        SystemSetting::query()->where('key', 'task_due_soon_warning_days')->delete();

        putenv('TASK_DUE_SOON_WARNING_DAYS=7');
        $_ENV['TASK_DUE_SOON_WARNING_DAYS'] = '7';

        $today = Carbon::today();
        $dueAt = $today->copy()->addDays(6)->startOfDay();

        $this->createTaskWithAssigneeDueAt($creator, $assignee, $dueAt);

        $command = new NotifyTaskDueSoonAndOverdue();
        $bridge = $this->makeBridge();

        $command->handle($bridge, new NotificationService());

        $this->assertSame(
            1,
            SystemNotification::query()
                ->where('user_id', $assignee->id)
                ->where('event_key', 'task.due_soon')
                ->count()
        );
    }

    #[Test]
    public function task_overdue_reminders_can_be_disabled(): void
    {
        config()->set('notifications.notification_engine.enabled', true);
        config()->set('notifications.notification_engine.pilot.enabled', true);
        config()->set('notifications.notification_engine.pilot.pilot_event_keys', ['task.overdue']);
        config()->set('notifications.notification_engine.fallback_to_legacy_when_skipped', false);

        $this->seedTaskOverduePolicy();

        $creator = User::factory()->create();
        $assignee = User::factory()->create();

        SystemSetting::set('task_overdue_reminders_enabled', '0');

        $today = Carbon::today();
        $overdueDueAt = $today->copy()->subDays(2)->startOfDay();

        $this->createTaskWithAssigneeDueAt($creator, $assignee, $overdueDueAt);

        $command = new NotifyTaskDueSoonAndOverdue();
        $bridge = $this->makeBridge();

        $command->handle($bridge, new NotificationService());

        $this->assertSame(
            0,
            SystemNotification::query()
                ->where('user_id', $assignee->id)
                ->where('event_key', 'task.overdue')
                ->count()
        );
    }
}

