<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationEnginePilotGate
{
    /**
     * Whether the configured pilot list is in wildcard mode (route every event through the engine when pilot is on).
     *
     * @param  array<int, mixed>  $pilotEventKeys
     */
    public static function pilotIncludesWildcard(array $pilotEventKeys): bool
    {
        foreach ($pilotEventKeys as $key) {
            if (is_string($key) && $key === '*') {
                return true;
            }
        }

        return false;
    }

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

        if (self::pilotIncludesWildcard($eventKeys)) {
            return true;
        }

        return in_array($emittedEventKey, $eventKeys, true);
    }
}

