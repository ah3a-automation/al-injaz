<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

final class SettingsController extends Controller
{
    public function mailSettings(Request $request): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }
        $settings = SystemSetting::getMailSettings();
        $maskedSettings = $settings;
        $hasPassword = $settings['mail_password'] !== '';
        if ($hasPassword) {
            $maskedSettings['mail_password'] = '••••••••';
        }
        return Inertia::render('Settings/Mail', [
            'settings' => $maskedSettings,
            'hasPassword' => $hasPassword,
        ]);
    }

    public function updateMailSettings(Request $request): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }
        $validated = $request->validate([
            'mail_host' => ['required', 'string', 'max:255'],
            'mail_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:255'],
            'mail_encryption' => ['required', 'string', 'in:tls,ssl,none'],
            'mail_from_name' => ['required', 'string', 'max:255'],
            'mail_from_email' => ['required', 'email', 'max:255'],
        ]);

        SystemSetting::set('mail_host', $validated['mail_host'], false, SystemSetting::GROUP_MAIL);
        SystemSetting::set('mail_port', $validated['mail_port'], false, SystemSetting::GROUP_MAIL);
        SystemSetting::set('mail_username', $validated['mail_username'] ?? '', false, SystemSetting::GROUP_MAIL);
        if (isset($validated['mail_password']) && $validated['mail_password'] !== '') {
            SystemSetting::set('mail_password', $validated['mail_password'], true, SystemSetting::GROUP_MAIL);
        }
        SystemSetting::set('mail_encryption', $validated['mail_encryption'], false, SystemSetting::GROUP_MAIL);
        SystemSetting::set('mail_from_name', $validated['mail_from_name'], false, SystemSetting::GROUP_MAIL);
        SystemSetting::set('mail_from_email', $validated['mail_from_email'], false, SystemSetting::GROUP_MAIL);

        SystemSetting::applyMailConfig();

        return redirect()->back()->with('success', 'Mail settings saved successfully.');
    }

    public function testMailSettings(Request $request): JsonResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }
        $validated = $request->validate([
            'test_email' => ['required', 'email', 'max:255'],
        ]);

        $host = SystemSetting::get('mail_host', '');
        $fromEmail = SystemSetting::get('mail_from_email', '');
        if ($host === '' || $fromEmail === '') {
            return response()->json([
                'success' => false,
                'message' => 'Please save SMTP host and From Email before sending a test.',
            ], 422);
        }

        SystemSetting::applyMailConfig();

        try {
            Mail::to($validated['test_email'])
                ->send(new \App\Mail\TestMail($validated['test_email']));
            return response()->json([
                'success' => true,
                'message' => "Test email sent successfully to {$validated['test_email']}",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed: ' . $e->getMessage(),
            ], 422);
        }
    }
}
