<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreNotificationPreferencesBatchRequest;
use App\Models\SystemSetting;
use App\Models\UserNotificationPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class NotificationPreferenceController extends Controller
{
    public function index(): InertiaResponse
    {
        $userId = (int) auth()->id();

        $templates = DB::table('notification_templates')
            ->orderBy('name')
            ->get([
                'event_code',
                'name',
                'inapp_enabled',
                'email_enabled',
                'whatsapp_enabled',
            ]);

        $prefs = UserNotificationPreference::query()
            ->forUser($userId)
            ->get(['event_key', 'channel', 'is_enabled'])
            ->groupBy('event_key');

        /** @var list<array<string, mixed>> $preferences */
        $preferences = [];

        foreach ($templates as $template) {
            $inapp = (bool) $template->inapp_enabled;
            $email = (bool) $template->email_enabled;
            $whatsapp = (bool) $template->whatsapp_enabled && SystemSetting::isEvolutionApiConfigured();

            if (! $inapp && ! $email && ! $whatsapp) {
                continue;
            }

            $eventKey = (string) $template->event_code;
            $rowsForEvent = $prefs->get($eventKey, collect());

            /** @var array<string, array{enabled: bool, admin_allows: bool}> $channels */
            $channels = [];

            if ($inapp) {
                $channels['inapp'] = [
                    'enabled'      => $this->resolveEnabled($rowsForEvent, UserNotificationPreference::CHANNEL_INAPP, true),
                    'admin_allows' => true,
                ];
            }
            if ($email) {
                $channels['email'] = [
                    'enabled'      => $this->resolveEnabled($rowsForEvent, UserNotificationPreference::CHANNEL_EMAIL, true),
                    'admin_allows' => true,
                ];
            }
            if ($whatsapp) {
                $channels['whatsapp'] = [
                    'enabled'      => $this->resolveEnabled($rowsForEvent, UserNotificationPreference::CHANNEL_WHATSAPP, true),
                    'admin_allows' => true,
                ];
            }

            $preferences[] = [
                'event_key'  => $eventKey,
                'event_name' => (string) $template->name,
                'channels'   => $channels,
            ];
        }

        return Inertia::render('NotificationPreferences/Index', [
            'preferences'    => $preferences,
            'isSupplierPortal' => auth()->user()?->hasRole('supplier') ?? false,
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, UserNotificationPreference>  $rowsForEvent
     */
    private function resolveEnabled($rowsForEvent, string $channel, bool $adminAllows): bool
    {
        $row = $rowsForEvent->first(
            static fn (UserNotificationPreference $p): bool => $p->channel === $channel
        );

        if ($row === null) {
            return $adminAllows;
        }

        return (bool) $row->is_enabled;
    }

    public function batch(StoreNotificationPreferencesBatchRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated('preferences');

        $eventKeys = collect($validated)->pluck('event_key')->unique()->values()->all();

        $templates = DB::table('notification_templates')
            ->whereIn('event_code', $eventKeys)
            ->get()
            ->keyBy('event_code');

        $errors = [];

        foreach ($validated as $index => $row) {
            $eventKey = $row['event_key'];
            $channel = $row['channel'];
            $wantsEnabled = (bool) $row['is_enabled'];

            $template = $templates->get($eventKey);
            if ($template === null) {
                $errors["preferences.{$index}.event_key"] = __('validation.exists', ['attribute' => 'event_key']);

                continue;
            }

            $adminAllows = match ($channel) {
                'inapp' => (bool) $template->inapp_enabled,
                'email' => (bool) $template->email_enabled,
                'whatsapp' => (bool) $template->whatsapp_enabled && SystemSetting::isEvolutionApiConfigured(),
                default => false,
            };

            if (! $adminAllows) {
                if ($wantsEnabled) {
                    $errors["preferences.{$index}.is_enabled"] = __('ui.notification_preferences_cannot_enable');
                }

                continue;
            }

            if ($wantsEnabled === $adminAllows) {
                UserNotificationPreference::query()
                    ->where('user_id', $user->id)
                    ->where('event_key', $eventKey)
                    ->where('channel', $channel)
                    ->delete();
            } else {
                UserNotificationPreference::query()->updateOrCreate(
                    [
                        'user_id'   => $user->id,
                        'event_key' => $eventKey,
                        'channel'   => $channel,
                    ],
                    ['is_enabled' => $wantsEnabled]
                );
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return redirect()
            ->route('notification-preferences.index')
            ->with('success', __('ui.notification_preferences_saved'));
    }
}
