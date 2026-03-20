<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

final class BrandingHelper
{
    public const CACHE_KEY = 'company_branding_blade';

    /**
     * @return array{
     *     display_name: string,
     *     logo_light: string|null,
     *     logo_dark: string|null,
     *     logo: string|null,
     *     brand_primary_color: string,
     *     brand_secondary_color: string|null,
     *     website: string|null,
     *     email: string|null,
     *     phone: string|null,
     * }
     */
    public static function get(): array
    {
        /** @var array<string, mixed> $branding */
        $branding = Cache::rememberForever(self::CACHE_KEY, static function (): array {
            $raw = SystemSetting::getBrandingCache();

            $displayName = $raw['company_name_en']
                ?? $raw['company_name']
                ?? config('app.name', 'Al Injaz');

            $logoLight = $raw['company_logo_light'] ?? null;
            $logoDark = $raw['company_logo_dark'] ?? null;

            $logoPath = $logoLight ?: ($logoDark ?: null);

            return [
                'display_name'        => (string) $displayName,
                'logo_light'          => $logoLight ? 'storage/' . ltrim((string) $logoLight, '/') : null,
                'logo_dark'           => $logoDark ? 'storage/' . ltrim((string) $logoDark, '/') : null,
                'logo'                => $logoPath ? 'storage/' . ltrim((string) $logoPath, '/') : null,
                'brand_primary_color' => $raw['brand_primary_color'] ?? '#1a56db',
                'brand_secondary_color' => $raw['brand_secondary_color'] ?? null,
                'website'             => $raw['company_website'] ?? null,
                'email'               => $raw['company_email'] ?? null,
                'phone'               => $raw['company_phone'] ?? null,
            ];
        });

        return $branding;
    }
}

