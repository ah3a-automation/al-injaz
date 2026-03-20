<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Notifications\NotificationEventCatalog;
use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use Illuminate\Database\Seeder;
use Throwable;

final class NotificationConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $definitions = NotificationEventCatalog::hardenedDefinitions();

        $eventKeys = array_keys($definitions);

        // Pass 1: ensure all catalog event keys exist in `notification_settings`.
        // This guarantees index completeness even if recipient backfill fails for an event.
        foreach ($definitions as $eventKey => $definition) {
            try {
                /** @var NotificationSetting $setting */
                $setting = NotificationSetting::firstOrCreate(
                    ['event_key' => $eventKey],
                    [
                        'source_event_key' => $definition['source_event_key'],
                        'template_event_code' => $definition['template_event_code'],
                        'name' => $definition['name'],
                        'description' => $definition['description'],
                        'notes' => $definition['notes'],
                        'module' => $definition['module'],
                        'is_enabled' => $definition['is_seed_enabled_by_default'],
                        'send_internal' => $definition['default_channels']['send_internal'],
                        'send_email' => $definition['default_channels']['send_email'],
                        'send_broadcast' => $definition['default_channels']['send_broadcast'],
                        'send_sms' => $definition['default_channels']['send_sms'],
                        'send_whatsapp' => $definition['default_channels']['send_whatsapp'],
                        'delivery_mode' => $definition['delivery_mode'],
                        'digest_frequency' => $definition['digest_frequency'],
                        'environment_scope' => $definition['environment_scope'],
                        'conditions_json' => $definition['conditions_json'],
                    ]
                );

                // Phase 1.5 backfill: do not overwrite admin toggles; only fill compatibility
                // metadata if columns were added after the record already existed.
                $needsSave = false;
                if ($setting->source_event_key === null && $definition['source_event_key'] !== null) {
                    $setting->source_event_key = $definition['source_event_key'];
                    $needsSave = true;
                }

                if ($setting->template_event_code === null && $definition['template_event_code'] !== null) {
                    $setting->template_event_code = $definition['template_event_code'];
                    $needsSave = true;
                }

                if ($setting->notes === null && $definition['notes'] !== null) {
                    $setting->notes = $definition['notes'];
                    $needsSave = true;
                }

                if ($needsSave) {
                    $setting->save();
                }
            } catch (Throwable $e) {
                logger()->warning('NotificationConfigurationSeeder: failed ensuring notification_settings', [
                    'event_key' => $eventKey,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $settingsByKey = NotificationSetting::query()
            ->whereIn('event_key', $eventKeys)
            ->get()
            ->keyBy('event_key');

        // Pass 2: backfill recipients per catalog definition.
        foreach ($definitions as $eventKey => $definition) {
            try {
                /** @var NotificationSetting|null $setting */
                $setting = $settingsByKey->get($eventKey);
                if (! $setting) {
                    continue;
                }

                foreach ($definition['default_recipient_rules'] as $recipientRule) {
                    NotificationRecipient::firstOrCreate(
                        [
                            'notification_setting_id' => $setting->id,
                            'recipient_type' => $recipientRule['recipient_type'],
                            'role_name' => $recipientRule['role_name'],
                            'user_id' => $recipientRule['user_id'],
                            'recipient_value' => $recipientRule['recipient_value'],
                            'channel_override' => $recipientRule['channel_override'],
                        ],
                        [
                            'resolver_config_json' => $recipientRule['resolver_config_json'],
                            'is_enabled' => $recipientRule['is_enabled'],
                            'sort_order' => $recipientRule['sort_order'],
                        ]
                    );
                }
            } catch (Throwable $e) {
                logger()->warning('NotificationConfigurationSeeder: failed ensuring notification_recipients', [
                    'event_key' => $eventKey,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}

