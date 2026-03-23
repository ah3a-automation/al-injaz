<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\NotificationRecipient;
use App\Models\NotificationSetting;
use App\Models\SystemSetting;
use App\Services\System\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Spatie\Permission\Models\Role;
use App\Services\ActivityLogger;
use App\Services\Notifications\NotificationEnginePilotGate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class NotificationConfigurationController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly NotificationService $notificationService
    ) {}

    private function requiredNotificationTablesPresent(): bool
    {
        return Schema::hasTable('notification_settings') && Schema::hasTable('notification_recipients');
    }

    /**
     * @return array<string, mixed>
     */
    private function tablesMissingPayload(): array
    {
        return [
            'tables_missing' => true,
            'setup_message' => 'Notification Configuration tables are not migrated yet.',
            'migration_hint' => 'Run: php artisan migrate',
        ];
    }

    /**
     * Admin index for business notification policies.
     */
    public function index(Request $request): InertiaResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            $pilotKeys = config('notifications.notification_engine.pilot.pilot_event_keys', []);
            if (! is_array($pilotKeys)) {
                $pilotKeys = [];
            }

            return Inertia::render('Settings/NotificationConfiguration/Index', [
                'settings' => [
                    'data' => [],
                    'links' => [],
                    'meta' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => 25,
                        'total' => 0,
                    ],
                ],
                'filters' => [
                    'search' => '',
                    'module' => '',
                    'enabled' => '',
                    'channel' => '',
                    'pilot' => '',
                ],
                'modules' => [],
                'pilot_event_keys' => $pilotKeys,
                'pilot_all_events' => NotificationEnginePilotGate::pilotIncludesWildcard($pilotKeys),
                ...$this->tablesMissingPayload(),
            ]);
        }

        $search = trim((string) $request->input('search', ''));
        $module = trim((string) $request->input('module', ''));
        $enabled = (string) $request->input('enabled', '');
        $channel = (string) $request->input('channel', '');
        $pilot = (string) $request->input('pilot', '');

        $pilotKeys = config('notifications.notification_engine.pilot.pilot_event_keys', []);
        if (! is_array($pilotKeys)) {
            $pilotKeys = [];
        }

        $query = NotificationSetting::query()->orderBy('module')->orderBy('event_key');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('event_key', 'ilike', '%' . $search . '%')
                    ->orWhere('name', 'ilike', '%' . $search . '%')
                    ->orWhere('description', 'ilike', '%' . $search . '%')
                    ->orWhere('source_event_key', 'ilike', '%' . $search . '%')
                    ->orWhere('template_event_code', 'ilike', '%' . $search . '%');
            });
        }

        if ($module !== '') {
            $query->where('module', $module);
        }

        if ($enabled === '1') {
            $query->where('is_enabled', true);
        } elseif ($enabled === '0') {
            $query->where('is_enabled', false);
        }

        if ($channel !== '') {
            $allowed = [
                'internal' => 'send_internal',
                'email' => 'send_email',
                'sms' => 'send_sms',
                'whatsapp' => 'send_whatsapp',
            ];

            $col = $allowed[$channel] ?? null;
            if (is_string($col)) {
                $query->where($col, true);
            }
        }

        if ($pilot === '1') {
            if (! NotificationEnginePilotGate::pilotIncludesWildcard($pilotKeys)) {
                $query->whereIn('event_key', $pilotKeys);
            }
        } elseif ($pilot === '0') {
            if (NotificationEnginePilotGate::pilotIncludesWildcard($pilotKeys)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereNotIn('event_key', $pilotKeys);
            }
        }

        $settings = $query->paginate(25)->withQueryString();

        $modules = NotificationSetting::query()
            ->distinct()
            ->orderBy('module')
            ->whereNotNull('module')
            ->where('module', '!=', '')
            ->pluck('module')
            ->toArray();

        return Inertia::render('Settings/NotificationConfiguration/Index', [
            'settings' => $settings,
            'filters' => [
                'search' => $search,
                'module' => $module,
                'enabled' => $enabled,
                'channel' => $channel,
                'pilot' => $pilot,
            ],
            'modules' => $modules,
            'pilot_event_keys' => $pilotKeys,
            'pilot_all_events' => NotificationEnginePilotGate::pilotIncludesWildcard($pilotKeys),
        ]);
    }

    public function edit(Request $request, string $setting): InertiaResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return Inertia::render('Settings/NotificationConfiguration/Edit', [
                'setting' => null,
                'is_pilot_event' => false,
                'roles' => [],
                ...$this->tablesMissingPayload(),
            ]);
        }

        $pilotKeys = config('notifications.notification_engine.pilot.pilot_event_keys', []);
        if (! is_array($pilotKeys)) {
            $pilotKeys = [];
        }

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();
        $settingModel->load(['recipients' => function ($q): void {
            $q->orderBy('sort_order')->orderBy('created_at');
        }]);

        $roles = Role::query()->orderBy('name')->pluck('name')->toArray();

        $pilotWildcard = NotificationEnginePilotGate::pilotIncludesWildcard($pilotKeys);

        return Inertia::render('Settings/NotificationConfiguration/Edit', [
            'setting' => $settingModel,
            'is_pilot_event' => $pilotWildcard || in_array($settingModel->event_key, $pilotKeys, true),
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, string $setting): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return redirect()->back()->with('error', 'Notification Configuration tables are not migrated yet.');
        }

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();

        $oldValues = $settingModel->only([
            'is_enabled',
            'send_internal',
            'send_email',
            'send_sms',
            'send_whatsapp',
            'conditions_json',
            'notes',
        ]);

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
            'send_internal' => ['required', 'boolean'],
            'send_email' => ['required', 'boolean'],
            'send_sms' => ['required', 'boolean'],
            'send_whatsapp' => ['required', 'boolean'],
            'conditions_json' => ['nullable', 'string'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $conditionsRaw = $validated['conditions_json'] ?? '';
        $conditionsJson = [];
        if (is_string($conditionsRaw) && trim($conditionsRaw) !== '') {
            $decoded = json_decode($conditionsRaw, true);
            if (! is_array($decoded)) {
                return redirect()
                    ->back()
                    ->withErrors(['conditions_json' => 'Invalid JSON (must decode to an object/array).']);
            }
            $conditionsJson = $decoded;
        }

        $settingModel->update([
            'is_enabled' => (bool) $validated['is_enabled'],
            'send_internal' => (bool) $validated['send_internal'],
            'send_email' => (bool) $validated['send_email'],
            'send_sms' => (bool) $validated['send_sms'],
            'send_whatsapp' => (bool) $validated['send_whatsapp'],
            'conditions_json' => $conditionsJson,
            'notes' => $validated['notes'] ?? $settingModel->notes,
        ]);

        $newValues = $settingModel->fresh()->only([
            'is_enabled',
            'send_internal',
            'send_email',
            'send_sms',
            'send_whatsapp',
            'conditions_json',
            'notes',
        ]);

        $this->activityLogger->log(
            event: 'notifications.notification_setting.updated',
            subject: $settingModel,
            oldValues: $oldValues,
            newValues: $newValues,
            causer: $request->user()
        );

        return redirect()
            ->back()
            ->with('success', 'Notification policy updated.');
    }

    /**
     * Inline enable/disable from the index list (no channel changes).
     */
    public function toggleEnabled(Request $request, string $setting): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return redirect()->back()->with('error', 'Notification Configuration tables are not migrated yet.');
        }

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();

        $oldValues = $settingModel->only(['is_enabled']);
        $settingModel->update([
            'is_enabled' => (bool) $validated['is_enabled'],
        ]);

        $newValues = $settingModel->fresh()->only(['is_enabled']);

        $this->activityLogger->log(
            event: 'notifications.notification_setting.updated',
            subject: $settingModel,
            oldValues: $oldValues,
            newValues: $newValues,
            causer: $request->user()
        );

        return redirect()
            ->back()
            ->with('success', 'Notification policy updated.');
    }

    /**
     * Send a safe test notification (in-app + email only) to the current admin — does not use WhatsApp/SMS or the notification engine.
     */
    public function testNotification(Request $request, string $setting): JsonResponse
    {
        if (! $request->user()?->can('settings.manage')) {
            return response()->json([
                'success' => false,
                'channels_attempted' => ['internal', 'email'],
                'channel_results' => [],
                'message' => trans('admin.notification_configuration_test_api_forbidden'),
                'notification_id' => null,
            ], 403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return response()->json([
                'success' => false,
                'channels_attempted' => ['internal', 'email'],
                'channel_results' => [],
                'message' => trans('admin.notification_configuration_test_api_tables_missing'),
                'notification_id' => null,
            ]);
        }

        try {
            $user = $request->user();
            if ($user === null) {
                return response()->json([
                    'success' => false,
                    'channels_attempted' => ['internal', 'email'],
                    'channel_results' => [],
                    'message' => trans('admin.notification_configuration_test_api_unauthenticated'),
                    'notification_id' => null,
                ], 401);
            }

            $settingModel = NotificationSetting::query()
                ->where('event_key', $setting)
                ->first();

            if ($settingModel === null) {
                return response()->json([
                    'success' => false,
                    'channels_attempted' => ['internal', 'email'],
                    'channel_results' => [],
                    'message' => trans('admin.notification_configuration_test_api_not_found'),
                    'notification_id' => null,
                ]);
            }

            $payload = $this->buildTestNotificationPayload();
            $eventKey = (string) $settingModel->event_key;
            $label = trim((string) ($settingModel->name ?? ''));
            if ($label === '') {
                $label = $eventKey;
            }

            $title = trans('admin.notification_configuration_test_in_app_title', ['label' => $label]);
            $message = $this->buildTestNotificationBodyMessage($payload);

            $metadata = array_merge($payload, [
                'notification_setting_id' => $settingModel->id,
                'test_initiated_by_user_id' => $user->id,
            ]);

            $channelsAttempted = ['internal', 'email'];
            /** @var list<array{channel: string, success: bool, error?: string}> $channelResults */
            $channelResults = [];
            $notificationId = null;

            try {
                $notification = $this->notificationService->notifyUser(
                    $user,
                    $eventKey,
                    $title,
                    $message,
                    '',
                    $metadata
                );
                $notificationId = (string) $notification->id;
                $channelResults[] = ['channel' => 'internal', 'success' => true];
            } catch (\Throwable $e) {
                $channelResults[] = [
                    'channel' => 'internal',
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }

            try {
                $email = trim((string) $user->email);
                if ($email === '') {
                    $channelResults[] = [
                        'channel' => 'email',
                        'success' => false,
                        'error' => (string) trans('admin.notification_configuration_test_email_no_address'),
                    ];
                } else {
                    $host = (string) SystemSetting::get('mail_host', '');
                    $fromEmail = (string) SystemSetting::get('mail_from_email', '');
                    if ($host === '' || $fromEmail === '') {
                        $channelResults[] = [
                            'channel' => 'email',
                            'success' => false,
                            'error' => (string) trans('admin.notification_configuration_test_email_not_configured'),
                        ];
                    } else {
                        SystemSetting::applyMailConfig();
                        $body = $this->buildTestEmailBody($eventKey, $label, $payload);
                        $subject = (string) trans('admin.notification_configuration_test_email_subject', ['event' => $eventKey]);
                        Mail::raw($body, function ($mail) use ($email, $subject): void {
                            $mail->to($email)->subject($subject);
                        });
                        $channelResults[] = ['channel' => 'email', 'success' => true];
                    }
                }
            } catch (\Throwable $e) {
                $channelResults[] = [
                    'channel' => 'email',
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }

            $internalOk = false;
            $emailOk = false;
            foreach ($channelResults as $row) {
                if (($row['channel'] ?? '') === 'internal' && ($row['success'] ?? false)) {
                    $internalOk = true;
                }
                if (($row['channel'] ?? '') === 'email' && ($row['success'] ?? false)) {
                    $emailOk = true;
                }
            }

            $success = $internalOk || $emailOk;
            $messageOut = $success
                ? (string) trans('admin.notification_configuration_test_api_success')
                : (string) trans('admin.notification_configuration_test_api_failed');

            return response()->json([
                'success' => $success,
                'channels_attempted' => $channelsAttempted,
                'channel_results' => $channelResults,
                'message' => $messageOut,
                'notification_id' => $notificationId,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'channels_attempted' => ['internal', 'email'],
                'channel_results' => [],
                'message' => $e->getMessage(),
                'notification_id' => null,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTestNotificationPayload(): array
    {
        return [
            'supplier_name' => 'Test Supplier Co.',
            'supplier_code' => 'SUP-TEST-001',
            'rfq_number' => 'RFQ-TEST-2026-001',
            'task_title' => 'Test Task',
            'contract_number' => 'CNT-TEST-001',
            'user_name' => 'Test User',
            'project_name' => 'Test Project',
            'is_test_notification' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function buildTestNotificationBodyMessage(array $payload): string
    {
        $lines = [
            (string) trans('admin.notification_configuration_test_body_intro'),
            '',
            (string) trans('admin.notification_configuration_test_body_sample_title'),
            'supplier_name: ' . (string) ($payload['supplier_name'] ?? ''),
            'supplier_code: ' . (string) ($payload['supplier_code'] ?? ''),
            'rfq_number: ' . (string) ($payload['rfq_number'] ?? ''),
            'task_title: ' . (string) ($payload['task_title'] ?? ''),
            'contract_number: ' . (string) ($payload['contract_number'] ?? ''),
            'user_name: ' . (string) ($payload['user_name'] ?? ''),
            'project_name: ' . (string) ($payload['project_name'] ?? ''),
        ];

        return implode("\n", $lines);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function buildTestEmailBody(string $eventKey, string $label, array $payload): string
    {
        $lines = [
            (string) trans('admin.notification_configuration_test_email_body_intro', ['event' => $eventKey, 'label' => $label]),
            '',
            (string) trans('admin.notification_configuration_test_body_sample_title'),
            'supplier_name: ' . (string) ($payload['supplier_name'] ?? ''),
            'supplier_code: ' . (string) ($payload['supplier_code'] ?? ''),
            'rfq_number: ' . (string) ($payload['rfq_number'] ?? ''),
            'task_title: ' . (string) ($payload['task_title'] ?? ''),
            'contract_number: ' . (string) ($payload['contract_number'] ?? ''),
            'user_name: ' . (string) ($payload['user_name'] ?? ''),
            'project_name: ' . (string) ($payload['project_name'] ?? ''),
            '',
            (string) trans('admin.notification_configuration_test_email_footer'),
        ];

        return implode("\n", $lines);
    }

    public function storeRecipient(Request $request, string $setting): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return redirect()->back()->with('error', 'Notification Configuration tables are not migrated yet.');
        }

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();

        $validated = $this->validateRecipient($request);

        $created = NotificationRecipient::create([
            'notification_setting_id' => $settingModel->id,
            'recipient_type' => $validated['recipient_type'],
            'role_name' => $validated['role_name'],
            'user_id' => $validated['user_id'],
            'recipient_value' => $validated['recipient_value'],
            'resolver_config_json' => $validated['resolver_config_json'],
            'channel_override' => $validated['channel_override'],
            'is_enabled' => (bool) $validated['is_enabled'],
            'sort_order' => (int) $validated['sort_order'],
        ]);

        $this->activityLogger->log(
            event: 'notifications.notification_recipient.created',
            subject: $created,
            oldValues: [],
            newValues: $this->recipientAuditSnapshot($created),
            causer: $request->user()
        );

        return redirect()->back()->with('success', 'Recipient rule added.');
    }

    public function updateRecipient(
        Request $request,
        string $setting,
        string $recipient
    ): RedirectResponse {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return redirect()->back()->with('error', 'Notification Configuration tables are not migrated yet.');
        }

        if (! Str::isUuid($recipient)) {
            return redirect()->back()->with('error', 'Invalid notification recipient identifier.');
        }

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();
        $recipientModel = NotificationRecipient::query()->findOrFail($recipient);

        if ((string) $recipientModel->notification_setting_id !== (string) $settingModel->id) {
            abort(404);
        }

        $validated = $this->validateRecipient($request);

        $old = $this->recipientAuditSnapshot($recipientModel);

        $recipientModel->update([
            'recipient_type' => $validated['recipient_type'],
            'role_name' => $validated['role_name'],
            'user_id' => $validated['user_id'],
            'recipient_value' => $validated['recipient_value'],
            'resolver_config_json' => $validated['resolver_config_json'],
            'channel_override' => $validated['channel_override'],
            'is_enabled' => (bool) $validated['is_enabled'],
            'sort_order' => (int) $validated['sort_order'],
        ]);

        $this->activityLogger->log(
            event: 'notifications.notification_recipient.updated',
            subject: $recipientModel,
            oldValues: $old,
            newValues: $this->recipientAuditSnapshot($recipientModel->fresh()),
            causer: $request->user()
        );

        return redirect()->back()->with('success', 'Recipient rule updated.');
    }

    public function destroyRecipient(
        Request $request,
        string $setting,
        string $recipient
    ): RedirectResponse {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (! $this->requiredNotificationTablesPresent()) {
            return redirect()->back()->with('error', 'Notification Configuration tables are not migrated yet.');
        }

        if (! Str::isUuid($recipient)) {
            return redirect()->back()->with('error', 'Invalid notification recipient identifier.');
        }

        $settingModel = NotificationSetting::query()
            ->where('event_key', $setting)
            ->firstOrFail();
        $recipientModel = NotificationRecipient::query()->findOrFail($recipient);

        if ((string) $recipientModel->notification_setting_id !== (string) $settingModel->id) {
            abort(404);
        }

        $old = $this->recipientAuditSnapshot($recipientModel);
        $recipientModel->delete();

        $this->activityLogger->log(
            event: 'notifications.notification_recipient.deleted',
            subject: $recipientModel,
            oldValues: $old,
            newValues: [],
            causer: $request->user()
        );

        return redirect()->back()->with('success', 'Recipient rule removed.');
    }

    public function userSearch(Request $request): JsonResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $q = trim((string) $request->query('q', ''));
        $limit = 15;

        $query = User::query()
            ->select(['id', 'name', 'email']);

        if ($q !== '') {
            $query->where(function ($qq) use ($q): void {
                $qq->where('name', 'ilike', '%' . $q . '%')
                    ->orWhere('email', 'ilike', '%' . $q . '%');
            });
        }

        $users = $query
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json([
            'results' => $users->map(fn (User $u) => [
                'id' => $u->id,
                'label' => trim($u->name . ' <' . $u->email . '>'),
                'email' => $u->email,
            ]),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function recipientAuditSnapshot(NotificationRecipient $recipient): array
    {
        $recipientValue = $recipient->recipient_value;
        if (is_string($recipientValue) && $recipient->recipient_type === 'explicit_email') {
            $recipientValue = $this->maskEmailForAudit($recipientValue);
        }

        $resolverConfig = $recipient->resolver_config_json;

        return [
            'recipient_type' => (string) $recipient->recipient_type,
            'role_name' => $recipient->role_name,
            'user_id' => $recipient->user_id,
            'recipient_value' => $recipientValue,
            'channel_override' => $recipient->channel_override,
            'is_enabled' => (bool) $recipient->is_enabled,
            'sort_order' => (int) $recipient->sort_order,
            // Do not store full resolver JSON in audit logs (may contain PII).
            'resolver_config_present' => is_array($resolverConfig) && $resolverConfig !== [],
        ];
    }

    private function maskEmailForAudit(string $email): string
    {
        // Keep only a safe, partial representation:
        // first char of local part + last 2 chars, then the domain.
        // Example: john.doe@x.com -> j••••oe@x.com
        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            return '***';
        }

        [$local, $domain] = $parts;
        if ($local === '' || $domain === '') {
            return '***';
        }

        $first = $local[0] ?? '';
        $last2 = mb_substr($local, -2);

        return $first . '••••' . $last2 . '@' . $domain;
    }

    /**
     * @return array{
     *   recipient_type: string,
     *   recipient_value: string|null,
     *   role_name: string|null,
     *   user_id: int|null,
     *   resolver_config_json: array<string, mixed>|null,
     *   channel_override: string|null,
     *   is_enabled: bool,
     *   sort_order: int
     * }
     */
    private function validateRecipient(Request $request): array
    {
        $validated = $request->validate([
            'recipient_type' => ['required', 'string', 'in:user,role,approver,assigned_user,supplier_user,actor,creator,record_creator,explicit_email'],
            'recipient_value' => ['nullable', 'string', 'max:255'],
            'role_name' => ['nullable', 'string', 'max:191'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'resolver_config_json' => ['nullable', 'string'],
            'channel_override' => ['nullable', 'string', 'in:internal,email'],
            'is_enabled' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:1000'],
        ]);

        $resolverConfig = null;
        $resolverConfigRaw = $validated['resolver_config_json'] ?? null;
        if (is_string($resolverConfigRaw) && trim($resolverConfigRaw) !== '') {
            $decoded = json_decode($resolverConfigRaw, true);
            if (! is_array($decoded)) {
                throw ValidationException::withMessages([
                    'resolver_config_json' => 'Invalid JSON (must decode to an object/array).',
                ]);
            }
            $resolverConfig = $decoded;
        }

        $type = (string) $validated['recipient_type'];
        $recipientValue = isset($validated['recipient_value']) ? trim((string) $validated['recipient_value']) : null;
        $roleName = isset($validated['role_name']) ? trim((string) $validated['role_name']) : null;
        $userId = $validated['user_id'] ?? null;

        // Type-specific validation.
        if ($type === 'explicit_email') {
            if ($recipientValue === null || $recipientValue === '') {
                throw ValidationException::withMessages([
                    'recipient_value' => 'Email is required for explicit_email recipient type.',
                ]);
            }
            if (filter_var($recipientValue, FILTER_VALIDATE_EMAIL) === false) {
                throw ValidationException::withMessages([
                    'recipient_value' => 'Invalid email address.',
                ]);
            }
        }

        if ($type === 'user' && $userId === null) {
            throw ValidationException::withMessages([
                'user_id' => 'User is required for user recipient type.',
            ]);
        }

        if ($type === 'role') {
            if ($roleName === null || $roleName === '') {
                throw ValidationException::withMessages([
                    'role_name' => 'Role is required for role recipient type.',
                ]);
            }
        }

        if ($type === 'approver') {
            if ($roleName === null || $roleName === '') {
                throw ValidationException::withMessages([
                    'role_name' => 'Role/permission is required for approver recipient type.',
                ]);
            }
        }

        // Clear irrelevant fields to avoid invalid combinations.
        if ($type !== 'role' && $type !== 'approver') {
            $roleName = null;
        }
        if ($type !== 'user') {
            $userId = null;
        }
        if ($type !== 'explicit_email') {
            // Keep recipient_value available for future types, but in v1 only explicit_email uses it in UI.
            $recipientValue = $recipientValue !== '' ? $recipientValue : null;
        }

        return [
            'recipient_type' => $type,
            'recipient_value' => $recipientValue !== '' ? $recipientValue : null,
            'role_name' => $roleName !== '' ? $roleName : null,
            'user_id' => $userId,
            'resolver_config_json' => $resolverConfig,
            'channel_override' => $validated['channel_override'] ?? null,
            'is_enabled' => (bool) $validated['is_enabled'],
            'sort_order' => (int) $validated['sort_order'],
        ];
    }
}

