<?php

declare(strict_types=1);

namespace App\Application\Notifications;

use App\Models\SystemNotification;
use App\Models\User;
use App\Notifications\BaseAppNotification;
use Illuminate\Database\Eloquent\Model;

final class WriteSystemNotificationAction
{
    public function execute(
        User $recipient,
        BaseAppNotification $notification,
        ?Model $subject,
    ): SystemNotification {
        $payload = $notification->toArray($recipient);

        $title = is_string($payload['title'] ?? null) ? $payload['title'] : $notification->getEventCode();
        $message = is_string($payload['body'] ?? null) ? $payload['body'] : '';
        $link = isset($payload['link']) && is_string($payload['link']) && $payload['link'] !== ''
            ? $payload['link']
            : null;

        $meta = $notification->getNotificationMetadata();

        return SystemNotification::create([
            'user_id'         => $recipient->id,
            'notifiable_type' => $subject !== null ? $subject->getMorphClass() : null,
            'notifiable_id'   => $subject !== null ? (string) $subject->getKey() : null,
            'event_key'       => $notification->getEventCode(),
            'title'           => $title,
            'message'         => $message,
            'link'            => $link,
            'status'          => SystemNotification::STATUS_PENDING,
            'metadata'        => $meta !== [] ? $meta : null,
        ]);
    }
}
