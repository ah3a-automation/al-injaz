<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SystemNotification;
use App\Models\SystemSetting;
use App\Models\NotificationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

final class NotificationSettingsController extends Controller
{
    public function settings(Request $request): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $warningDays = (int) SystemSetting::get('supplier_document_expiry_warning_days', 30);
        $notifyInapp = SystemSetting::get('supplier_document_expiry_notify_inapp', '1') === '1';
        $notifyEmail = SystemSetting::get('supplier_document_expiry_notify_email', '1') === '1';
        $taskDueSoonWarningDays = (int) SystemSetting::get(
            'task_due_soon_warning_days',
            (int) env('TASK_DUE_SOON_WARNING_DAYS', '7')
        );
        $taskOverdueRemindersEnabled = SystemSetting::get(
            'task_overdue_reminders_enabled',
            (string) env('TASK_OVERDUE_REMINDERS_ENABLED', '1')
        ) === '1';

        $engineEnabled = (bool) config('notifications.notification_engine.enabled', false);
        $pilotEnabled = (bool) config('notifications.notification_engine.pilot.enabled', false);
        $pilotKeys = config('notifications.notification_engine.pilot.pilot_event_keys', []);

        $tablesMissing = ! Schema::hasTable('notification_settings')
            || ! Schema::hasTable('notification_recipients');

        if ($tablesMissing) {
            $taskDueSoonPolicy = null;
            $taskOverduePolicy = null;
        } else {
            $taskReminderSettings = NotificationSetting::query()
                ->whereIn('event_key', ['task.due_soon', 'task.overdue'])
                ->get()
                ->keyBy('event_key');

            $taskDueSoonPolicy = $taskReminderSettings->get('task.due_soon');
            $taskOverduePolicy = $taskReminderSettings->get('task.overdue');
        }

        return Inertia::render('Settings/NotificationSettings', [
            'supplier_doc_expiry_warning_days' => $warningDays,
            'supplier_doc_expiry_notify_inapp' => $notifyInapp,
            'supplier_doc_expiry_notify_email' => $notifyEmail,
            'task_due_soon_warning_days' => $taskDueSoonWarningDays < 1 ? 7 : $taskDueSoonWarningDays,
            'task_overdue_reminders_enabled' => $taskOverdueRemindersEnabled,
            // Operational visibility (read-only)
            'task_due_soon_effective_warning_days' => $taskDueSoonWarningDays < 1 ? 7 : $taskDueSoonWarningDays,
            'task_overdue_effective_reminders_enabled' => $taskOverdueRemindersEnabled,
            'notification_engine_enabled' => $engineEnabled,
            'notification_engine_pilot_enabled' => $pilotEnabled,
            'task_due_soon_in_pilot_keys' => in_array('task.due_soon', $pilotKeys, true),
            'task_overdue_in_pilot_keys' => in_array('task.overdue', $pilotKeys, true),
            'task_due_soon_policy_configured' => $taskDueSoonPolicy !== null,
            'task_due_soon_policy_enabled' => $taskDueSoonPolicy?->is_enabled ?? null,
            'task_overdue_policy_configured' => $taskOverduePolicy !== null,
            'task_overdue_policy_enabled' => $taskOverduePolicy?->is_enabled ?? null,
            'tables_missing' => $tablesMissing,
            'setup_message' => 'Notification Configuration tables are not migrated yet.',
            'migration_hint' => 'Run: php artisan migrate',
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $validated = $request->validate([
            'supplier_document_expiry_warning_days' => ['required', 'integer', 'min:1', 'max:365'],
            'supplier_document_expiry_notify_inapp' => ['required', 'boolean'],
            'supplier_document_expiry_notify_email' => ['required', 'boolean'],
            'task_due_soon_warning_days' => ['required', 'integer', 'min:1', 'max:365'],
            'task_overdue_reminders_enabled' => ['sometimes', 'boolean'],
        ]);

        SystemSetting::set(
            'supplier_document_expiry_warning_days',
            $validated['supplier_document_expiry_warning_days'],
        );
        SystemSetting::set(
            'supplier_document_expiry_notify_inapp',
            $validated['supplier_document_expiry_notify_inapp'] ? '1' : '0',
        );
        SystemSetting::set(
            'supplier_document_expiry_notify_email',
            $validated['supplier_document_expiry_notify_email'] ? '1' : '0',
        );

        SystemSetting::set(
            'task_due_soon_warning_days',
            $validated['task_due_soon_warning_days']
        );

        $defaultOverdueEnabled = SystemSetting::get(
            'task_overdue_reminders_enabled',
            (string) env('TASK_OVERDUE_REMINDERS_ENABLED', '1')
        ) === '1';

        $overdueEnabled = array_key_exists('task_overdue_reminders_enabled', $validated)
            ? (bool) $validated['task_overdue_reminders_enabled']
            : $defaultOverdueEnabled;

        SystemSetting::set(
            'task_overdue_reminders_enabled',
            $overdueEnabled ? '1' : '0'
        );

        return redirect()->route('settings.notifications.index')
            ->with('success', 'Notification settings updated successfully.');
    }

    public function history(Request $request): Response
    {
        $query = SystemNotification::query()
            ->with(['user:id,name,email'])
            ->latest('created_at');

        if ($search = (string) $request->input('search', '')) {
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'ilike', '%' . $search . '%')
                    ->orWhere('message', 'ilike', '%' . $search . '%')
                    ->orWhere('event_key', 'ilike', '%' . $search . '%');
            });
        }

        if ($type = (string) $request->input('type', '')) {
            $query->where('event_key', $type);
        }

        if ($from = (string) $request->input('date_from', '')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = (string) $request->input('date_to', '')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $notifications = $query->paginate(50)->withQueryString();

        $eventTypes = SystemNotification::query()
            ->distinct()
            ->orderBy('event_key')
            ->whereNotNull('event_key')
            ->where('event_key', '!=', '')
            ->pluck('event_key');

        return Inertia::render('Settings/NotificationHistory', [
            'notifications' => $notifications,
            'eventTypes'    => $eventTypes,
            'filters'       => $request->only(['search', 'type', 'date_from', 'date_to']),
        ]);
    }
}

