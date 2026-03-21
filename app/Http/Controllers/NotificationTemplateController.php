<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Mail\SystemNotificationMail;
use App\Models\NotificationTemplate;
use App\Models\SystemSetting;
use App\Support\BrandingHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class NotificationTemplateController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        SystemSetting::applyEvolutionConfig();

        $templates = DB::table('notification_templates')
            ->orderBy('name')
            ->get([
                'id',
                'event_code',
                'name',
                'body_text',
                'whatsapp_body',
                'whatsapp_enabled',
                'email_enabled',
                'inapp_enabled',
            ]);

        return Inertia::render('Settings/NotificationTemplates/Index', [
            'templates' => $templates,
            'evolution_configured' => SystemSetting::isEvolutionApiConfigured(),
        ]);
    }

    public function edit(Request $request, NotificationTemplate $notificationTemplate): InertiaResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        SystemSetting::applyEvolutionConfig();

        return Inertia::render('Settings/NotificationTemplates/Edit', [
            'template' => [
                'id' => $notificationTemplate->id,
                'event_code' => $notificationTemplate->event_code,
                'name' => $notificationTemplate->name,
                'subject' => $notificationTemplate->subject,
                'body_text' => $notificationTemplate->body_text,
                'body_html' => $notificationTemplate->body_html,
                'email_enabled' => $notificationTemplate->email_enabled,
                'inapp_enabled' => $notificationTemplate->inapp_enabled,
                'whatsapp_enabled' => $notificationTemplate->whatsapp_enabled,
                'whatsapp_body' => $notificationTemplate->whatsapp_body,
            ],
            'evolution_configured' => SystemSetting::isEvolutionApiConfigured(),
        ]);
    }

    public function update(Request $request, NotificationTemplate $notificationTemplate): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body_text' => ['required', 'string', 'max:65000'],
            'body_html' => ['nullable', 'string', 'max:65000'],
            'email_enabled' => ['required', 'boolean'],
            'inapp_enabled' => ['required', 'boolean'],
            'whatsapp_enabled' => ['required', 'boolean'],
            'whatsapp_body' => ['nullable', 'string', 'max:8000'],
        ]);

        if ($validated['whatsapp_enabled'] && ! SystemSetting::isEvolutionApiConfigured()) {
            return redirect()
                ->back()
                ->withErrors(['whatsapp_enabled' => __('admin.whatsapp_enable_requires_evolution')]);
        }

        $notificationTemplate->update([
            'subject' => $validated['subject'],
            'body_text' => $validated['body_text'],
            'body_html' => $validated['body_html'] !== null && $validated['body_html'] !== ''
                ? $validated['body_html']
                : null,
            'email_enabled' => $validated['email_enabled'],
            'inapp_enabled' => $validated['inapp_enabled'],
            'whatsapp_enabled' => $validated['whatsapp_enabled'],
            'whatsapp_body' => $validated['whatsapp_body'] ?? null,
        ]);

        return redirect()
            ->route('settings.notification-templates.edit', $notificationTemplate)
            ->with('success', __('admin.notification_template_updated'));
    }

    public function preview(Request $request, NotificationTemplate $notificationTemplate): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $mail = $this->buildPreviewMailable($notificationTemplate);

        return response($mail->render(), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function test(Request $request, NotificationTemplate $notificationTemplate): JsonResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $user = $request->user();
        if ($user === null || $user->email === null || $user->email === '') {
            return response()->json(['message' => __('admin.notification_template_test_no_email')], 422);
        }

        try {
            $mail = $this->buildPreviewMailable($notificationTemplate);
            Mail::to($user->email)->send($mail);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => __('admin.notification_template_test_failed')], 500);
        }

        return response()->json(['message' => __('admin.notification_template_test_sent')]);
    }

    public function updateWhatsApp(Request $request, string $event_code): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $validated = $request->validate([
            'whatsapp_enabled' => ['required', 'boolean'],
            'whatsapp_body' => ['nullable', 'string', 'max:8000'],
        ]);

        if ($validated['whatsapp_enabled'] && ! SystemSetting::isEvolutionApiConfigured()) {
            return redirect()
                ->back()
                ->withErrors(['whatsapp_enabled' => __('admin.whatsapp_enable_requires_evolution')]);
        }

        DB::table('notification_templates')
            ->where('event_code', $event_code)
            ->update([
                'whatsapp_enabled' => $validated['whatsapp_enabled'],
                'whatsapp_body' => $validated['whatsapp_body'] ?? null,
                'updated_at' => now(),
            ]);

        return redirect()->back()->with('success', __('admin.notification_template_updated'));
    }

    private function buildPreviewMailable(NotificationTemplate $notificationTemplate): SystemNotificationMail
    {
        $vars = $this->dummyVariablesForEventCode($notificationTemplate->event_code);
        $subject = $this->replaceTemplateVars((string) ($notificationTemplate->subject ?? 'Notification'), $vars);

        $bodyHtmlRaw = $notificationTemplate->body_html;
        if ($bodyHtmlRaw !== null && trim($bodyHtmlRaw) !== '') {
            $bodyHtml = $this->replaceTemplateVars($bodyHtmlRaw, $vars);
        } else {
            $bodyHtml = $this->plainTextToPreviewHtml(
                $this->replaceTemplateVars($notificationTemplate->body_text, $vars)
            );
        }

        $branding = BrandingHelper::get();
        $companyName = $branding['display_name'];
        $logoUrl = $branding['logo'] !== null ? asset($branding['logo']) : null;
        $primaryColor = $branding['brand_primary_color'] ?? '#373d42';

        $actionUrl = url('/');
        $actionText = 'View Details';

        return new SystemNotificationMail(
            subjectLine: $subject,
            bodyHtml: $bodyHtml,
            actionText: $actionText,
            actionUrl: $actionUrl,
            companyName: $companyName,
            logoUrl: $logoUrl,
            primaryColor: $primaryColor,
        );
    }

    /**
     * @return array<string, string>
     */
    private function dummyVariablesForEventCode(string $eventCode): array
    {
        return match ($eventCode) {
            'supplier.registered' => [
                'supplier_name' => 'Test Supplier',
                'supplier_code' => 'TS-001',
            ],
            'supplier.approved' => [
                'supplier_name' => 'Test Supplier',
                'set_password_url' => url('/password/reset/sample'),
            ],
            'supplier.rejected' => [
                'supplier_name' => 'Test Supplier',
                'rejection_reason' => 'Documents incomplete.',
            ],
            'supplier.more_info_requested' => [
                'supplier_name' => 'Test Supplier',
                'more_info_notes' => 'Please upload your trade license.',
                'complete_profile_url' => url('/supplier/status'),
            ],
            'task.assigned' => [
                'task_title' => 'Sample Task',
                'project_name' => 'Sample Project',
                'assigned_by' => 'Admin User',
            ],
            'project.created' => [
                'project_name' => 'Sample Project',
                'created_by' => 'Admin User',
            ],
            'user.created' => [
                'user_name' => 'Test User',
                'set_password_url' => url('/password/reset/sample'),
            ],
            default => [
                'supplier_name' => 'Test Supplier',
                'supplier_code' => 'TS-001',
            ],
        };
    }

    /**
     * @param array<string, string> $vars
     */
    private function replaceTemplateVars(string $template, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $template = str_replace('{{' . $key . '}}', $value, $template);
        }

        return $template;
    }

    private function plainTextToPreviewHtml(string $plain): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $plain) ?: [];
        $strippedLines = [];
        foreach ($lines as $line) {
            $strippedLines[] = preg_replace('/^\s*#+\s*/u', '', $line) ?? '';
        }
        $body = implode("\n", $strippedLines);
        $body = preg_replace('/\*\*(.+?)\*\*/us', '$1', $body) ?? $body;
        $body = str_replace('**', '', $body);
        $body = trim($body);
        if ($body === '') {
            return '';
        }

        $paragraphs = preg_split('/\r\n\s*\r\n|\n\s*\n/', $body, -1, PREG_SPLIT_NO_EMPTY) ?: [$body];
        $out = [];
        foreach ($paragraphs as $paragraph) {
            $p = trim($paragraph);
            if ($p !== '') {
                $out[] = '<p style="margin:0 0 12px 0;">' . e($p) . '</p>';
            }
        }

        return implode('', $out);
    }
}
