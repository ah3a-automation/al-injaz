<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Application\Notifications\ResolvedNotificationPlan;
use App\Application\Notifications\ResolvedRecipient;
use App\Models\User;
use App\Models\UserNotificationPreference;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class NotificationResolver
{
    public function resolve(
        string $eventKey,
        User $recipient,
        ?Model $subject,
        ?int $actorUserId,
    ): ResolvedNotificationPlan {
        $template = DB::table('notification_templates')->where('event_code', $eventKey)->first();
        if ($template === null) {
            return new ResolvedNotificationPlan($eventKey, null, collect());
        }

        if ($actorUserId !== null
            && $actorUserId === (int) $recipient->id
            && ! (bool) ($template->allow_self_notify ?? false)) {
            return new ResolvedNotificationPlan($eventKey, $template, collect());
        }

        /** @var list<string> $channels */
        $channels = [];
        if ($template->inapp_enabled) {
            $channels[] = UserNotificationPreference::CHANNEL_INAPP;
        }
        if ($template->email_enabled) {
            $channels[] = UserNotificationPreference::CHANNEL_EMAIL;
        }
        if ($template->whatsapp_enabled) {
            $channels[] = UserNotificationPreference::CHANNEL_WHATSAPP;
        }
        if ($template->sms_enabled) {
            $channels[] = UserNotificationPreference::CHANNEL_SMS;
        }

        /** @var array<int, string> $disabled */
        $disabled = UserNotificationPreference::query()
            ->forUser((int) $recipient->id)
            ->forEvent($eventKey)
            ->where('is_enabled', false)
            ->pluck('channel')
            ->all();

        $channels = array_values(array_diff($channels, $disabled));

        /** @var Collection<int, ResolvedRecipient> $recipients */
        $recipients = new Collection([
            new ResolvedRecipient((int) $recipient->id, $channels),
        ]);

        return new ResolvedNotificationPlan($eventKey, $template, $recipients);
    }
}
