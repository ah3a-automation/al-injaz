<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class CompanyBrandingController extends Controller
{
    public function index(): Response
    {
        $raw = SystemSetting::getMany(SystemSetting::BRANDING_KEYS);
        $lastUpdatedAt = SystemSetting::whereIn('key', SystemSetting::BRANDING_KEYS)->max('updated_at');

        $branding = [
            'company_name_en'       => $raw['company_name_en'] ?? $raw['company_name'] ?? '',
            'company_name_ar'      => $raw['company_name_ar'] ?? '',
            'company_short_name_en'=> $raw['company_short_name_en'] ?? $raw['company_short_name'] ?? '',
            'company_short_name_ar'=> $raw['company_short_name_ar'] ?? '',
            'company_logo_light'   => $raw['company_logo_light'] ?? $raw['company_logo'] ?? null,
            'company_logo_dark'    => $raw['company_logo_dark'] ?? null,
            'company_sidebar_icon' => $raw['company_sidebar_icon'] ?? null,
            'company_favicon'      => $raw['company_favicon'] ?? null,
            'company_phone'        => $raw['company_phone'] ?? null,
            'company_email'        => $raw['company_email'] ?? null,
            'company_website'      => $raw['company_website'] ?? null,
            'company_address'      => $raw['company_address'] ?? null,
            'sidebar_brand_mode'   => $raw['sidebar_brand_mode'] ?? 'logo_text',
            'brand_primary_color'  => $raw['brand_primary_color'] ?? '#373d42',
            'brand_secondary_color'=> $raw['brand_secondary_color'] ?? '#bfa849',
            'color_success'        => $raw['color_success'] ?? '#16a34a',
            'color_warning'        => $raw['color_warning'] ?? '#d97706',
            'color_danger'         => $raw['color_danger'] ?? '#dc2626',
            'color_info'           => $raw['color_info'] ?? '#2563eb',
            'color_sidebar_bg'     => $raw['color_sidebar_bg'] ?? '#373d42',
            'color_sidebar_text'   => $raw['color_sidebar_text'] ?? '#ffffff',
        ];

        return Inertia::render('Admin/CompanyBranding', [
            'branding' => $branding,
            'brandingLastUpdatedAt' => $lastUpdatedAt
                ? Carbon::parse($lastUpdatedAt)->toIso8601String()
                : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'company_name_en'        => ['required', 'string', 'max:255'],
            'company_name_ar'        => ['nullable', 'string', 'max:255'],
            'company_short_name_en'   => ['nullable', 'string', 'max:100'],
            'company_short_name_ar'  => ['nullable', 'string', 'max:100'],
            'company_phone'           => ['nullable', 'string', 'max:50'],
            'company_email'           => ['nullable', 'email', 'max:255'],
            'company_website'         => ['nullable', 'url', 'max:255'],
            'company_address'         => ['nullable', 'string', 'max:1000'],
            'sidebar_brand_mode'      => ['required', Rule::in(['logo', 'text', 'logo_text'])],
            'brand_primary_color'     => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'brand_secondary_color'  => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_success'           => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_warning'           => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_danger'            => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_info'              => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_sidebar_bg'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'color_sidebar_text'     => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'company_logo_light'      => ['nullable', 'image', 'max:2048'],
            'company_logo_dark'       => ['nullable', 'image', 'max:2048'],
            'company_sidebar_icon'    => ['nullable', 'image', 'max:2048'],
            'company_favicon'         => ['nullable', 'mimes:ico,png,svg', 'max:1024'],
            'remove_logo_light'       => ['nullable', 'boolean'],
            'remove_logo_dark'        => ['nullable', 'boolean'],
            'remove_sidebar_icon'     => ['nullable', 'boolean'],
            'remove_favicon'          => ['nullable', 'boolean'],
        ]);

        $address = $request->filled('company_address')
            ? strip_tags($request->input('company_address'))
            : null;

        // Process removals before uploads
        $removals = [
            'remove_logo_light'   => 'company_logo_light',
            'remove_logo_dark'    => 'company_logo_dark',
            'remove_sidebar_icon' => 'company_sidebar_icon',
            'remove_favicon'      => 'company_favicon',
        ];
        foreach ($removals as $flagKey => $settingKey) {
            if ($request->boolean($flagKey)) {
                $old = SystemSetting::get($settingKey);
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
                SystemSetting::set($settingKey, '');
            }
        }

        $fileKeys = [
            'company_logo_light'   => 'company_logo_light',
            'company_logo_dark'    => 'company_logo_dark',
            'company_sidebar_icon' => 'company_sidebar_icon',
            'company_favicon'      => 'company_favicon',
        ];
        foreach ($fileKeys as $key => $requestKey) {
            if ($request->hasFile($requestKey)) {
                $old = SystemSetting::get($key);
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
                $path = $request->file($requestKey)->store('branding', 'public');
                SystemSetting::set($key, $path);
            }
        }

        SystemSetting::set('company_name_en', $request->company_name_en);
        SystemSetting::set('company_name_ar', $request->company_name_ar ?? '');
        SystemSetting::set('company_short_name_en', $request->company_short_name_en ?? '');
        SystemSetting::set('company_short_name_ar', $request->company_short_name_ar ?? '');
        SystemSetting::set('company_phone', $request->company_phone ?? '');
        SystemSetting::set('company_email', $request->company_email ?? '');
        SystemSetting::set('company_website', $request->company_website ?? '');
        SystemSetting::set('company_address', $address ?? '');
        SystemSetting::set('sidebar_brand_mode', $request->sidebar_brand_mode);
        SystemSetting::set('brand_primary_color', $request->brand_primary_color ?? '#373d42');
        SystemSetting::set('brand_secondary_color', $request->brand_secondary_color ?? '#bfa849');
        SystemSetting::set('color_success', $request->color_success ?? '#16a34a');
        SystemSetting::set('color_warning', $request->color_warning ?? '#d97706');
        SystemSetting::set('color_danger', $request->color_danger ?? '#dc2626');
        SystemSetting::set('color_info', $request->color_info ?? '#2563eb');
        SystemSetting::set('color_sidebar_bg', $request->color_sidebar_bg ?? '#373d42');
        SystemSetting::set('color_sidebar_text', $request->color_sidebar_text ?? '#ffffff');

        Cache::forget(SystemSetting::BRANDING_CACHE_KEY);
        Cache::forget(\App\Support\BrandingHelper::CACHE_KEY);

        return back()->with('success', __('admin.branding_updated'));
    }
}
