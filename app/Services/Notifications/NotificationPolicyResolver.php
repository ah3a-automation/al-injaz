<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Domain\Notifications\NotificationEventCatalog;
use App\Models\NotificationSetting;

final class NotificationPolicyResolver
{
    public function __construct(
        private readonly NotificationEventCatalog $catalog = new NotificationEventCatalog(),
    ) {}

    /**
     * Resolve the effective notification policy for an emitted event key.
     *
     * Alias normalization is centralized here. Downstream services receive
     * a policy that is already environment-checked.
     */
    public function resolve(string $emittedEventKey, NotificationEventContext $context): ?ResolvedNotificationPolicyData
    {
        $canonicalEventKey = NotificationEventCatalog::canonicalEventKey($emittedEventKey);
        $effectiveEventKeysToTry = NotificationEventCatalog::aliasesFor($canonicalEventKey);

        // Backward compatibility: first try exact emitted key (including `.internal`).
        $setting = NotificationSetting::query()
            ->where('event_key', $emittedEventKey)
            ->first();

        if ($setting === null && $canonicalEventKey !== $emittedEventKey) {
            // Then fall back to canonical key (or other transitional aliases).
            $setting = NotificationSetting::query()
                ->whereIn('event_key', $effectiveEventKeysToTry)
                ->first();
        }

        if ($setting === null) {
            logger()->debug('NotificationPolicyResolver: setting missing', [
                'emitted_event_key' => $emittedEventKey,
                'canonical_event_key' => $canonicalEventKey,
            ]);

            return null;
        }

        $envAllowed = $this->environmentScopeAllows(
            $setting->environment_scope ?? 'all'
        );

        $isEnabled = (bool) $setting->is_enabled && $envAllowed;

        logger()->debug('NotificationPolicyResolver: policy resolved', [
            'emitted_event_key' => $emittedEventKey,
            'effective_event_key' => $setting->event_key,
            'canonical_event_key' => $canonicalEventKey,
            'is_enabled' => $isEnabled,
            'environment_scope' => $setting->environment_scope,
        ]);

        return new ResolvedNotificationPolicyData(
            emittedEventKey: $emittedEventKey,
            effectiveEventKey: (string) $setting->event_key,
            canonicalEventKey: $canonicalEventKey,
            notificationSettingId: (string) $setting->id,
            module: (string) $setting->module,
            isEnabled: $isEnabled,
            sendInternal: (bool) $setting->send_internal,
            sendEmail: (bool) $setting->send_email,
            sendSms: (bool) $setting->send_sms,
            sendWhatsapp: (bool) $setting->send_whatsapp,
            deliveryMode: (string) $setting->delivery_mode,
            digestFrequency: $setting->digest_frequency,
            environmentScope: (string) $setting->environment_scope,
            conditionsJson: is_array($setting->conditions_json) ? $setting->conditions_json : [],
            templateEventCode: $setting->template_event_code,
            sourceEventKey: $setting->source_event_key,
            metadata: $context->getMetadata(),
        );
    }

    private function environmentScopeAllows(string $environmentScope): bool
    {
        // In Laravel, config('app.env') is typically "local" in dev, and "production"
        // (or similar) in hosted environments.
        $appEnv = (string) (config('app.env') ?: 'production');
        $isLocal = $appEnv === 'local' || $appEnv === 'development';

        return match ($environmentScope) {
            'all' => true,
            'local_only' => $isLocal,
            'production_only' => ! $isLocal,
            default => true,
        };
    }
}

