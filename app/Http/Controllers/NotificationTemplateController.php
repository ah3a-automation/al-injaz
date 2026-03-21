<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function update(Request $request, string $event_code): RedirectResponse
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
}
