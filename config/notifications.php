<?php

declare(strict_types=1);

return [
    'notification_engine' => [
        /*
         * Master enable for the Phase 2 notification engine wiring.
         * When false, legacy notification behavior remains unchanged.
         */
        'enabled' => filter_var(env('NOTIFICATION_ENGINE_ENABLED', 'false'), FILTER_VALIDATE_BOOLEAN),

        /*
         * Pilot integration enablement:
         * - When enabled, only event keys listed in `pilot_event_keys` are routed to
         *   the new engine (unless wildcard mode — see below).
         * - Other events continue through legacy flows.
         *
         * Wildcard (opt-in):
         * - Set NOTIFICATION_ENGINE_PILOT_EVENT_KEYS=* (alone or in a comma list) to route
         *   every event through the engine while pilot is enabled.
         * - NotificationEnginePilotGate::pilotIncludesWildcard() detects the `*` token.
         */
        'pilot' => [
            'enabled' => filter_var(env('NOTIFICATION_ENGINE_PILOT_ENABLED', 'true'), FILTER_VALIDATE_BOOLEAN),
            'pilot_event_keys' => array_values(array_filter(
                array_map('trim', explode(',', (string) env(
                    'NOTIFICATION_ENGINE_PILOT_EVENT_KEYS',
                    'supplier.document_expiring_soon,rfq.issued,rfq.issued.supplier,contract.activated,rfq.awarded,clarification.added.supplier,clarification.answered'
                    . ',rfq.evaluation,quote.submitted,quote.revised,clarification.made_public' // Phase 4 expansion (internal-only)
                    . ',supplier.document_expiring_soon.internal,supplier.document_expired.internal' // Phase 5 migration (approver recipient)
                    . ',task.assigned,task.due_soon,task.overdue' // Phase 6 task rollout (assigned_user recipient)
                ))),
                static fn (string $v): bool => $v !== ''
            )),
        ],

        /*
         * Safety net for pilot rollout:
         * - If the new engine is enabled for an event but dispatch is skipped (missing policy,
         *   no recipients, conditions failed), optionally fall back to the legacy path so
         *   user-facing notifications are not lost during pilot.
         */
        'fallback_to_legacy_when_skipped' => filter_var(env('NOTIFICATION_ENGINE_FALLBACK_TO_LEGACY', 'true'), FILTER_VALIDATE_BOOLEAN),

        /*
         * Outbox-driven dispatch (Phase 4.5)
         *
         * When enabled, `outbox:process` will route selected outbox events through
         * the new notification engine, using NotificationOutboxEventKeyMapper.
         *
         * Default is disabled to preserve legacy behavior.
         */
        'outbox_dispatch' => [
            'enabled' => filter_var(env('NOTIFICATION_ENGINE_OUTBOX_DISPATCH_ENABLED', 'false'), FILTER_VALIDATE_BOOLEAN),
            /*
             * Allow-list of outbox event keys to dispatch through the engine.
             * Example:
             *   rfq.evaluation,rfq.quote_submitted,rfq.clarification_public
             */
            'allowed_event_keys' => array_values(array_filter(
                array_map('trim', explode(',', (string) env('NOTIFICATION_ENGINE_OUTBOX_DISPATCH_EVENT_KEYS', ''))),
                static fn (string $v): bool => $v !== ''
            )),
        ],
    ],
];

