<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Events\SystemNotificationCreated;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\Notifications\Channels\SendInternalNotificationAction;
use App\Services\Notifications\NotificationDispatchChannelPlan;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\ResolvedRecipientData;
use App\Services\System\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SystemNotificationBroadcastTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function notify_user_dispatches_realtime_event_after_persistence(): void
    {
        Event::fake([SystemNotificationCreated::class]);

        $user = User::factory()->create();
        $service = new NotificationService();

        $notification = $service->notifyUser(
            user: $user,
            eventKey: 'task.assigned',
            title: 'Task Assigned',
            message: 'You have a new task',
            link: '/tasks/1',
            metadata: ['task_id' => 'task-uuid-1']
        );

        $this->assertDatabaseHas('system_notifications', [
            'id' => $notification->id,
            'user_id' => $user->id,
            'event_key' => 'task.assigned',
            'title' => 'Task Assigned',
        ]);

        Event::assertDispatched(SystemNotificationCreated::class, function (SystemNotificationCreated $event) use ($user, $notification): bool {
            return $event->userId === $user->id
                && $event->notificationId === (string) $notification->id
                && $event->eventKey === 'task.assigned'
                && $event->unreadCount === 1
                && $event->isUnread === true;
        });
    }

    #[Test]
    public function deduped_internal_send_does_not_dispatch_new_realtime_event(): void
    {
        Event::fake([SystemNotificationCreated::class]);

        $user = User::factory()->create();
        $eventKey = 'task.assigned';
        $taskId = 'task-uuid-1';

        SystemNotification::create([
            'user_id' => $user->id,
            'notifiable_type' => null,
            'notifiable_id' => null,
            'event_key' => $eventKey,
            'title' => 'Task Assigned',
            'message' => 'You have a new task',
            'link' => '/tasks/1',
            'status' => SystemNotification::STATUS_PENDING,
            'metadata' => [
                'task_id' => $taskId,
            ],
        ]);

        Event::assertNothingDispatched();

        $action = new SendInternalNotificationAction(new NotificationService());
        $plan = new NotificationDispatchChannelPlan(
            channel: 'internal',
            recipients: [
                new ResolvedRecipientData(
                    recipientType: 'assigned_user',
                    userId: $user->id,
                    email: $user->email,
                    channelOverride: null,
                ),
            ],
        );

        $created = $action->execute(
            emittedEventKey: $eventKey,
            plan: $plan,
            context: new NotificationEventContext([
                'title' => 'Task Assigned',
                'message' => 'You have a new task',
                'link' => '/tasks/1',
                'metadata' => [
                    'task_id' => $taskId,
                ],
            ])
        );

        $this->assertSame(0, $created);

        $this->assertSame(
            1,
            SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('event_key', $eventKey)
                ->count()
        );

        Event::assertNotDispatched(SystemNotificationCreated::class);
    }
}

