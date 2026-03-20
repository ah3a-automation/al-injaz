<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationEnginePilotGate
{
    public function shouldUseEngine(string $emittedEventKey): bool
    {
        $enabled = (bool) config('notifications.notification_engine.enabled', false);
        if (! $enabled) {
            return false;
        }

        $pilot = config('notifications.notification_engine.pilot', []);
        $pilotEnabled = (bool) ($pilot['enabled'] ?? false);
        if (! $pilotEnabled) {
            return false;
        }

        $eventKeys = $pilot['pilot_event_keys'] ?? [];
        if (! is_array($eventKeys)) {
            return false;
        }

        return in_array($emittedEventKey, $eventKeys, true);
    }
}

