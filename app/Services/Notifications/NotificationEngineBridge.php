<?php

declare(strict_types=1);

namespace App\Services\Notifications;

final class NotificationEngineBridge
{
    public function __construct(
        private readonly NotificationEnginePilotGate $pilotGate,
        private readonly NotificationDispatcher $dispatcher,
    ) {}

    /**
     * Route pilot events through the new engine while preserving legacy behavior.
     *
     * Duplicate-prevention strategy:
     * - If pilot gate says "use new engine", legacy dispatch will be executed only if
     *   the engine did not dispatch any channel.
     */
    public function dispatchOrLegacy(
        string $emittedEventKey,
        NotificationEventContext $context,
        callable $legacyDispatch
    ): void {
        $useEngine = $this->pilotGate->shouldUseEngine($emittedEventKey);

        logger()->debug('NotificationEngineBridge: routing decision', [
            'emitted_event_key' => $emittedEventKey,
            'use_new_engine' => $useEngine,
        ]);

        if (! $useEngine) {
            $legacyDispatch();

            return;
        }

        $result = $this->dispatcher->dispatch($emittedEventKey, $context);
        if ($result->dispatched) {
            logger()->debug('NotificationEngineBridge: engine dispatched; legacy skipped', [
                'emitted_event_key' => $emittedEventKey,
                'channels' => $result->executedChannels,
            ]);

            return;
        }

        $fallback = (bool) config('notifications.notification_engine.fallback_to_legacy_when_skipped', true);
        $allowedFallbackStatuses = [
            // Phase 2.6: fallback is intentionally narrow.
            // We only fallback when the new engine has no configured policy at all,
            // to preserve existing behavior for installs that haven't enabled seeds yet.
            'skipped_policy_missing',
        ];

        $shouldFallback = $fallback && in_array($result->status, $allowedFallbackStatuses, true);

        if ($shouldFallback) {
            logger()->debug('NotificationEngineBridge: engine skipped; falling back to legacy (allowed status)', [
                'emitted_event_key' => $emittedEventKey,
                'status' => $result->status,
                'skip_reason' => $result->skippedReason,
            ]);

            $legacyDispatch();

            return;
        }

        logger()->debug('NotificationEngineBridge: engine skipped; legacy not executed', [
            'emitted_event_key' => $emittedEventKey,
            'status' => $result->status,
            'skip_reason' => $result->skippedReason,
            'fallback_enabled' => $fallback,
            'fallback_allowed_for_status' => $shouldFallback,
        ]);
    }

    /**
     * Like dispatchOrLegacy(), but returns a DispatchResult so callers can
     * produce operational summaries (counts of dispatched vs skipped).
     *
     * @param callable(): void $legacyDispatch
     */
    public function dispatchOrLegacyWithResult(
        string $emittedEventKey,
        NotificationEventContext $context,
        callable $legacyDispatch
    ): NotificationDispatchResult {
        $useEngine = $this->pilotGate->shouldUseEngine($emittedEventKey);

        logger()->debug('NotificationEngineBridge: routing decision (with result)', [
            'emitted_event_key' => $emittedEventKey,
            'use_new_engine' => $useEngine,
        ]);

        if (! $useEngine) {
            $legacyDispatch();

            return new NotificationDispatchResult(
                dispatched: true,
                executedChannels: ['legacy'],
                status: 'dispatched_via_legacy_only',
                skippedReason: null,
                meta: [],
            );
        }

        $result = $this->dispatcher->dispatch($emittedEventKey, $context);
        if ($result->dispatched) {
            return $result;
        }

        $fallback = (bool) config('notifications.notification_engine.fallback_to_legacy_when_skipped', true);

        $allowedFallbackStatuses = [
            'skipped_policy_missing',
        ];

        $shouldFallback = $fallback && in_array($result->status, $allowedFallbackStatuses, true);

        if ($shouldFallback) {
            logger()->debug('NotificationEngineBridge: engine skipped; falling back to legacy (allowed status)', [
                'emitted_event_key' => $emittedEventKey,
                'status' => $result->status,
                'skip_reason' => $result->skippedReason,
            ]);

            $legacyDispatch();

            return new NotificationDispatchResult(
                dispatched: true,
                executedChannels: ['legacy'],
                status: 'dispatched_via_legacy_fallback',
                skippedReason: null,
                meta: [
                    'engine_status' => $result->status,
                    'engine_skipped_reason' => $result->skippedReason,
                ]
            );
        }

        return $result;
    }
}

