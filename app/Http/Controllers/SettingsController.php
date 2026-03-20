<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
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

    public function aiCategorySuggestions(Request $request): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }
        $ai_settings = [
            'enabled'     => SystemSetting::get('ai_category_suggestions_enabled', '0') === '1',
            'endpoint'    => SystemSetting::get('ai_category_suggestions_endpoint', ''),
            'api_key'     => '', // never expose
            'model'       => SystemSetting::get('ai_category_suggestions_model', 'gpt-4o-mini'),
            'sar_rate'    => SystemSetting::get('ai_category_suggestions_usd_sar_rate', '3.75'),
            'daily_limit' => SystemSetting::get('ai_category_suggestions_daily_usd_limit', '10.00'),
        ];
        $ai_usage = [
            'today' => [
                'total_tokens'    => (int) AiUsageLog::whereDate('created_at', today())->sum('total_tokens'),
                'cost_usd'        => (float) AiUsageLog::whereDate('created_at', today())->sum('cost_usd'),
                'cost_sar'        => (float) AiUsageLog::whereDate('created_at', today())->sum('cost_sar'),
                'request_count'   => AiUsageLog::whereDate('created_at', today())->count(),
                'avg_response_ms' => AiUsageLog::whereDate('created_at', today())->avg('response_time_ms'),
            ],
            'this_month' => [
                'total_tokens'    => (int) AiUsageLog::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('total_tokens'),
                'cost_usd'        => (float) AiUsageLog::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('cost_usd'),
                'cost_sar'        => (float) AiUsageLog::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('cost_sar'),
                'request_count'   => AiUsageLog::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count(),
                'avg_response_ms' => AiUsageLog::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->avg('response_time_ms'),
            ],
            'all_time' => [
                'total_tokens'    => (int) AiUsageLog::sum('total_tokens'),
                'cost_usd'        => (float) AiUsageLog::sum('cost_usd'),
                'cost_sar'        => (float) AiUsageLog::sum('cost_sar'),
                'request_count'   => AiUsageLog::count(),
                'avg_response_ms' => AiUsageLog::avg('response_time_ms'),
            ],
        ];
        return Inertia::render('Settings/AiCategorySuggestions', [
            'ai_settings' => $ai_settings,
            'ai_usage'    => $ai_usage,
        ]);
    }

    public function updateAiCategorySuggestions(Request $request): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }
        $validated = $request->validate([
            'ai_enabled'    => ['nullable', 'boolean'],
            'ai_endpoint'   => ['nullable', 'string', 'max:500'],
            'ai_api_key'    => ['nullable', 'string', 'max:500'],
            'ai_model'      => ['nullable', 'string', 'max:100'],
            'ai_sar_rate'   => ['nullable', 'string', 'max:20'],
            'ai_daily_limit' => ['nullable', 'string', 'max:20'],
        ]);
        SystemSetting::set('ai_category_suggestions_enabled', $request->boolean('ai_enabled') ? '1' : '0');
        SystemSetting::set('ai_category_suggestions_endpoint', $validated['ai_endpoint'] ?? '');
        if (isset($validated['ai_api_key']) && $validated['ai_api_key'] !== '') {
            SystemSetting::set('ai_category_suggestions_api_key', $validated['ai_api_key'], true);
        }
        SystemSetting::set('ai_category_suggestions_model', $validated['ai_model'] ?? 'gpt-4o-mini');
        SystemSetting::set('ai_category_suggestions_usd_sar_rate', $validated['ai_sar_rate'] ?? '3.75');
        SystemSetting::set('ai_category_suggestions_daily_usd_limit', $validated['ai_daily_limit'] ?? '10.00');
        return redirect()->back()->with('success', 'AI category suggestions settings saved.');
    }
}
