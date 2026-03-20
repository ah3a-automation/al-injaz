<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SystemNotification;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class SystemNotificationCreated implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly int $userId,
        public readonly string $notificationId,
        public readonly string $eventKey,
        public readonly string $title,
        public readonly string $message,
        public readonly ?string $link,
        public readonly string $createdAtIso,
        public readonly bool $isUnread,
        public readonly int $unreadCount,
    ) {}

    public static function fromModel(SystemNotification $notification, int $unreadCount): self
    {
        return new self(
            userId: (int) $notification->user_id,
            notificationId: (string) $notification->id,
            eventKey: (string) $notification->event_key,
            title: (string) $notification->title,
            message: (string) $notification->message,
            link: $notification->link !== null ? (string) $notification->link : null,
            createdAtIso: $notification->created_at?->toIso8601String() ?? now()->toIso8601String(),
            isUnread: $notification->status !== SystemNotification::STATUS_READ,
            unreadCount: $unreadCount,
        );
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('users.' . $this->userId . '.notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'system-notification.created';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'id' => $this->notificationId,
                'event_key' => $this->eventKey,
                'title' => $this->title,
                'message' => $this->message,
                'link' => $this->link,
                'created_at' => $this->createdAtIso,
                'is_unread' => $this->isUnread,
            ],
            'unread_count' => $this->unreadCount,
        ];
    }
}

