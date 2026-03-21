<?php

declare(strict_types=1);

namespace App\Domain\Notifications;

/**
 * Code-defined catalog of notification event keys that can be controlled by
 * the Notification Configuration system.
 *
 * IMPORTANT: This layer must not depend on Laravel or other framework code.
 */
final class NotificationEventCatalog
{
    private const INTERNAL_ALIAS_SUFFIX = '.internal';

    /**
     * Event codes that already have rows in `notification_templates.event_code`.
     *
     * Note: we intentionally keep this explicit to avoid guessing at runtime.
     *
     * @var array<int, string>
     */
    private const TEMPLATE_EVENT_CODES = [
        'supplier.registered',
        'supplier.approved',
        'supplier.rejected',
        'supplier.more_info_requested',
        'task.assigned',
        'task.reminder',
        'task.system_reminder',
        'task.comment_reminder',
        'project.created',
        'user.created',
    ];

    public static function canonicalEventKey(string $eventKey): string
    {
        return str_ends_with($eventKey, self::INTERNAL_ALIAS_SUFFIX)
            ? substr($eventKey, 0, -strlen(self::INTERNAL_ALIAS_SUFFIX))
            : $eventKey;
    }

    /**
     * Transitional aliases for the canonical business event.
     *
     * @return array<int, string>
     */
    public static function aliasesFor(string $canonicalEventKey): array
    {
        return [
            $canonicalEventKey,
            $canonicalEventKey . self::INTERNAL_ALIAS_SUFFIX,
        ];
    }

    /**
     * Canonical resolution helper for future engines.
     * For Phase 1.5 it is provided but not yet used by dispatchers/resolvers.
     */
    public static function resolveSeedKey(string $eventKey): string
    {
        return self::canonicalEventKey($eventKey);
    }

    /**
     * Hardened notification catalog contract used by Phase 2 engines and Phase 1.5 seeding.
     *
     * @return array<string, array{
     *     event_key: string,
     *     source_event_key: string|null,
     *     template_event_code: string|null,
     *     supports_internal: bool,
     *     supports_email: bool,
     *     supports_sms: bool,
     *     supports_whatsapp: bool,
     *     default_channels: array{
     *         send_internal: bool,
     *         send_email: bool,
     *         send_broadcast: bool,
     *         send_sms: bool,
     *         send_whatsapp: bool
     *     },
     *     default_recipient_rules: array<int, array{
     *         recipient_type: string,
     *         role_name: string|null,
     *         user_id: int|string|null,
     *         recipient_value: string|null,
     *         resolver_config_json: array<string, mixed>|null,
     *         channel_override: string|null,
     *         is_enabled: bool,
     *         sort_order: int
     *     }>,
     *     is_seed_enabled_by_default: bool,
     *     module: string,
     *     name: string,
     *     description: string|null,
     *     delivery_mode: 'immediate'|'digest',
     *     digest_frequency: 'hourly'|'daily'|null,
     *     environment_scope: 'all'|'local_only'|'production_only',
     *     conditions_json: array<string, mixed>,
     *     notes: string|null
     * }>
     */
    public static function hardenedDefinitions(): array
    {
        $raw = self::definitions();
        $templateCodes = array_fill_keys(self::TEMPLATE_EVENT_CODES, true);

        $result = [];
        foreach ($raw as $eventKey => $def) {
            $defaults = $def['defaults'];
            $isAlias = $eventKey !== self::canonicalEventKey($eventKey);

            $result[$eventKey] = [
                'event_key' => $eventKey,
                'source_event_key' => $isAlias ? self::canonicalEventKey($eventKey) : null,
                'template_event_code' => isset($templateCodes[$eventKey]) ? $eventKey : null,
                'supports_internal' => (bool) $defaults['send_internal'],
                'supports_email' => (bool) $defaults['send_email'],
                'supports_sms' => (bool) $defaults['send_sms'],
                'supports_whatsapp' => (bool) $defaults['send_whatsapp'],
                'default_channels' => [
                    'send_internal' => (bool) $defaults['send_internal'],
                    'send_email' => (bool) $defaults['send_email'],
                    'send_broadcast' => (bool) $defaults['send_broadcast'],
                    'send_sms' => (bool) $defaults['send_sms'],
                    'send_whatsapp' => (bool) $defaults['send_whatsapp'],
                ],
                'default_recipient_rules' => array_map(
                    static function (array $recipient, int $i): array {
                        return [
                            'recipient_type' => (string) $recipient['recipient_type'],
                            'role_name' => $recipient['role_name'] ?? null,
                            'user_id' => $recipient['user_id'] ?? null,
                            'recipient_value' => null,
                            'resolver_config_json' => null,
                            'channel_override' => null,
                            'is_enabled' => (bool) $recipient['is_enabled'],
                            'sort_order' => $i,
                        ];
                    },
                    $def['recipients'],
                    array_keys($def['recipients'])
                ),
                'is_seed_enabled_by_default' => (bool) $defaults['is_enabled'],
                'module' => (string) $def['module'],
                'name' => (string) $def['name'],
                'description' => $def['description'] ?? null,
                'delivery_mode' => (string) $defaults['delivery_mode'],
                'digest_frequency' => $defaults['digest_frequency'] ?? null,
                'environment_scope' => (string) $defaults['environment_scope'],
                'conditions_json' => $defaults['conditions_json'] ?? [],
                'notes' => $isAlias ? 'Transitional internal alias (Phase 2 should prefer canonical event_key).' : null,
            ];
        }

        return $result;
    }

    /**
     * @phpstan-type DeliveryMode string
     * @phpstan-type EnvironmentScope string
     *
     * @phpstan-type RecipientDefinition array{
     *     recipient_type: 'role'|'user'|'supplier_user'|'assigned_user'|'creator'|'approver'|'subject_owner'|'specific_user',
     *     role_name: string|null,
     *     user_id: int|string|null,
     *     is_enabled: bool
     * }
     *
     * @phpstan-type EventDefaults array{
     *     is_enabled: bool,
     *     send_internal: bool,
     *     send_email: bool,
     *     send_broadcast: bool,
     *     send_sms: bool,
     *     send_whatsapp: bool,
     *     delivery_mode: 'immediate'|'digest',
     *     digest_frequency: 'hourly'|'daily'|null,
     *     environment_scope: 'all'|'local_only'|'production_only',
     *     conditions_json: array<string, mixed>
     * }
     *
     * @phpstan-type EventDefinition array{
     *     event_key: string,
     *     name: string,
     *     description: string|null,
     *     module: string,
     *     defaults: EventDefaults,
     *     recipients: array<int, RecipientDefinition>
     * }
     *
     * @return array<string, EventDefinition> Indexed by canonical event_key.
     */
    public static function definitions(): array
    {
        // Canonical convention:
        // - Use existing event_key/event_code strings already present in the system.
        // - Use a `.internal` suffix for internal procurement recipients where the
        //   current code splits supplier vs internal notifications.
        //
        // Mapping from requested Phase 1 keys to existing system keys (compat):
        // - supplier.document.expiring     => supplier.document_expiring_soon
        // - supplier.document.missing     => supplier.document_missing (seeded but disabled by default)
        // - supplier.profile.incomplete   => supplier.profile_incomplete (seeded but disabled by default)
        // - rfq.* / contract.* required keys are seeded but disabled by default
        //   until wired to real event flows.
        return [
            // Supplier lifecycle (existing notification_templates)
            'supplier.registered' => [
                'event_key' => 'supplier.registered',
                'name' => 'Supplier Registered',
                'description' => 'A new supplier registration is waiting for review.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,   // in-app (Laravel database notifications)
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'approver',
                        'role_name' => 'suppliers.approve',
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.approved' => [
                'event_key' => 'supplier.approved',
                'name' => 'Supplier Approved',
                'description' => 'A supplier account has been approved.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => false,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.rejected' => [
                'event_key' => 'supplier.rejected',
                'name' => 'Supplier Rejected',
                'description' => 'A supplier application was rejected.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => false,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        // NOTE: current code routes mail to supplier.email directly.
                        // Phase 1 schema only supports user-based recipients, so we
                        // seed supplier_user here and handle the email-only case later.
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.more_info_requested' => [
                'event_key' => 'supplier.more_info_requested',
                'name' => 'More Information Required',
                'description' => 'A supplier needs to provide additional information.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => false,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // Supplier document readiness (existing in NotificationService)
            'supplier.document_missing' => [
                'event_key' => 'supplier.document_missing',
                'name' => 'Supplier Document Missing',
                'description' => 'A required supplier document is missing.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.document_expiring_soon' => [
                'event_key' => 'supplier.document_expiring_soon',
                'name' => 'Supplier Document Expiring Soon',
                'description' => 'A supplier document is close to expiry.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.6: enable real email execution for the currently piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.document_expiring_soon.internal' => [
                'event_key' => 'supplier.document_expiring_soon.internal',
                'name' => 'Supplier Document Expiring Soon (Internal)',
                'description' => 'Internal procurement users are notified when a document is close to expiry.',
                'module' => 'suppliers',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'approver',
                        'role_name' => 'suppliers.approve',
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.document_expired' => [
                'event_key' => 'supplier.document_expired',
                'name' => 'Supplier Document Expired',
                'description' => 'A supplier document has expired.',
                'module' => 'suppliers',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'supplier.document_expired.internal' => [
                'event_key' => 'supplier.document_expired.internal',
                'name' => 'Supplier Document Expired (Internal)',
                'description' => 'Internal procurement users are notified when a document has expired.',
                'module' => 'suppliers',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'approver',
                        'role_name' => 'suppliers.approve',
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            'supplier.profile_incomplete' => [
                'event_key' => 'supplier.profile_incomplete',
                'name' => 'Supplier Profile Incomplete',
                'description' => 'A supplier profile is missing required information.',
                'module' => 'suppliers',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // Tasks (existing in notification_templates / direct command notifications)
            'task.assigned' => [
                'event_key' => 'task.assigned',
                'name' => 'Task Assigned',
                'description' => 'A task was assigned to a user.',
                'module' => 'tasks',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'task.due_soon' => [
                'event_key' => 'task.due_soon',
                'name' => 'Task Due Soon',
                'description' => 'A task is due soon.',
                'module' => 'tasks',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'task.overdue' => [
                'event_key' => 'task.overdue',
                'name' => 'Task Overdue',
                'description' => 'A task is overdue.',
                'module' => 'tasks',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            // task_reminders.user_id — dispatch must pass assigned_user_id in notification context (single recipient).
            'task.reminder' => [
                'event_key' => 'task.reminder',
                'name' => 'Task reminder (scheduled)',
                'description' => 'A per-user task reminder from task_reminders fired.',
                'module' => 'tasks',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            // tasks.reminder_at — notify assignees; context may include task_id (resolver falls back to task_assignees).
            'task.system_reminder' => [
                'event_key' => 'task.system_reminder',
                'name' => 'Task system reminder',
                'description' => 'A system-level reminder_at on the task fired for assignees.',
                'module' => 'tasks',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            // task_comments.reminder_at — notify comment author; pass assigned_user_id = comment author in context.
            'task.comment_reminder' => [
                'event_key' => 'task.comment_reminder',
                'name' => 'Task comment follow-up',
                'description' => 'A reminder time on a task comment fired for the comment author.',
                'module' => 'tasks',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // RFQs / Quotes / Clarifications (existing NotificationService + outbox keys)
            'rfq.assigned' => [
                'event_key' => 'rfq.assigned',
                'name' => 'RFQ Assigned',
                'description' => 'An RFQ was assigned.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'assigned_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.deadline_soon' => [
                'event_key' => 'rfq.deadline_soon',
                'name' => 'RFQ Deadline Soon',
                'description' => 'An RFQ deadline is approaching.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'subject_owner',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.submitted' => [
                'event_key' => 'rfq.submitted',
                'name' => 'RFQ Submitted',
                'description' => 'An RFQ was submitted.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.issued' => [
                'event_key' => 'rfq.issued',
                'name' => 'RFQ Issued',
                'description' => 'An RFQ was issued to suppliers.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.6: enable real email execution for the currently piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.issued.supplier' => [
                'event_key' => 'rfq.issued.supplier',
                'name' => 'RFQ Issued (Supplier)',
                'description' => 'Invited suppliers are notified about RFQ issuance.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.6: enable real email execution for the currently piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'clarification.added' => [
                'event_key' => 'clarification.added',
                'name' => 'Clarification Added',
                'description' => 'A clarification request was submitted.',
                'module' => 'rfqs',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'clarification.added.supplier' => [
                'event_key' => 'clarification.added.supplier',
                'name' => 'Clarification Added (Supplier)',
                'description' => 'Suppliers are notified when a clarification is submitted.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.7: enable real email execution for the newly piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'clarification.answered' => [
                'event_key' => 'clarification.answered',
                'name' => 'Clarification Answered',
                'description' => 'Suppliers are notified when a clarification is answered.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.7: enable real email execution for the newly piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'clarification.made_public' => [
                'event_key' => 'clarification.made_public',
                'name' => 'Clarification Shared',
                'description' => 'Suppliers are notified when a clarification becomes visible.',
                'module' => 'rfqs',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.evaluation' => [
                'event_key' => 'rfq.evaluation',
                'name' => 'RFQ Moved to Evaluation',
                'description' => 'An RFQ was moved to evaluation stage.',
                'module' => 'rfqs',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.awarded' => [
                'event_key' => 'rfq.awarded',
                'name' => 'RFQ Awarded',
                'description' => 'An RFQ was awarded to a supplier.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.7: enable real email execution for the newly piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'quote.submitted' => [
                'event_key' => 'quote.submitted',
                'name' => 'Quote Submitted',
                'description' => 'A quote was submitted for an RFQ.',
                'module' => 'rfqs',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'quote.revised' => [
                'event_key' => 'quote.revised',
                'name' => 'Quote Revised',
                'description' => 'A quote was revised for an RFQ.',
                'module' => 'rfqs',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // Contracts (existing NotificationService)
            'contract.activated' => [
                'event_key' => 'contract.activated',
                'name' => 'Contract Activated',
                'description' => 'A contract was activated.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => true,
                    // Phase 2.6: enable real email execution for the currently piloted event.
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.submitted_for_review' => [
                'event_key' => 'contract.submitted_for_review',
                'name' => 'Contract Submitted for Review',
                'description' => 'A contract was submitted for review.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'approver',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.approved' => [
                'event_key' => 'contract.approved',
                'name' => 'Contract Approved',
                'description' => 'A contract was approved.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.rejected' => [
                'event_key' => 'contract.rejected',
                'name' => 'Contract Rejected',
                'description' => 'A contract was rejected.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.expiring' => [
                'event_key' => 'contract.expiring',
                'name' => 'Contract Expiring',
                'description' => 'A contract is close to expiry.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'approver',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // Other template event codes (seeded for policy completeness)
            'project.created' => [
                'event_key' => 'project.created',
                'name' => 'Project Created',
                'description' => 'A new project was created.',
                'module' => 'projects',
                'defaults' => [
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
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'subject_owner',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'user.created' => [
                'event_key' => 'user.created',
                'name' => 'Welcome — Set Your Password',
                'description' => 'A new system user was created.',
                'module' => 'users',
                'defaults' => [
                    'is_enabled' => true,
                    'send_internal' => false,
                    'send_email' => true,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'subject_owner',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            // Outbox-only keys (seeded disabled by default)
            'rfq.clarification_added' => [
                'event_key' => 'rfq.clarification_added',
                'name' => 'RFQ Clarification Added (Outbox)',
                'description' => 'Outbox event for clarification added.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.clarification_answered' => [
                'event_key' => 'rfq.clarification_answered',
                'name' => 'RFQ Clarification Answered (Outbox)',
                'description' => 'Outbox event for clarification answered.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.clarification_public' => [
                'event_key' => 'rfq.clarification_public',
                'name' => 'RFQ Clarification Public (Outbox)',
                'description' => 'Outbox event for clarification made public.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'rfq.quote_submitted' => [
                'event_key' => 'rfq.quote_submitted',
                'name' => 'RFQ Quote Submitted (Outbox)',
                'description' => 'Outbox event for quote submitted/revised.',
                'module' => 'rfqs',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],

            'contract.created' => [
                'event_key' => 'contract.created',
                'name' => 'Contract Created (Outbox)',
                'description' => 'Outbox event for contract creation.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.variation_approved' => [
                'event_key' => 'contract.variation_approved',
                'name' => 'Contract Variation Approved (Outbox)',
                'description' => 'Outbox event for approved contract variation.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'supplier_user',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
            'contract.invoice_paid' => [
                'event_key' => 'contract.invoice_paid',
                'name' => 'Contract Invoice Paid (Outbox)',
                'description' => 'Outbox event for invoice paid.',
                'module' => 'contracts',
                'defaults' => [
                    'is_enabled' => false,
                    'send_internal' => true,
                    'send_email' => false,
                    'send_broadcast' => false,
                    'send_sms' => false,
                    'send_whatsapp' => false,
                    'delivery_mode' => 'immediate',
                    'digest_frequency' => null,
                    'environment_scope' => 'all',
                    'conditions_json' => [],
                ],
                'recipients' => [
                    [
                        'recipient_type' => 'creator',
                        'role_name' => null,
                        'user_id' => null,
                        'is_enabled' => true,
                    ],
                ],
            ],
        ];
    }
}

