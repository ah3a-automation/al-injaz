<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;

class SystemSetting extends Model
{
    use HasFactory;

    public const GROUP_MAIL = 'mail';

    public const GROUP_GENERAL = 'general';

    public const BRANDING_CACHE_KEY = 'company_branding';

    /**
     * Keys used for company branding cache and favicon.
     *
     * @var list<string>
     */
    public const BRANDING_KEYS = [
        'company_name_en', 'company_name_ar', 'company_short_name_en', 'company_short_name_ar',
        'company_logo_light', 'company_logo_dark', 'company_sidebar_icon', 'company_favicon',
        'company_phone', 'company_email', 'company_website', 'company_address',
        'sidebar_brand_mode', 'brand_primary_color', 'brand_secondary_color',
        'color_success', 'color_warning', 'color_danger', 'color_info',
        'color_sidebar_bg', 'color_sidebar_text',
        'company_name', 'company_short_name', 'company_logo',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = ['key', 'value', 'is_encrypted', 'setting_group'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_encrypted' => 'boolean',
        ];
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, string|null>
     */
    public static function getMany(array $keys): array
    {
        if ($keys === []) {
            return [];
        }
        return static::whereIn('key', $keys)->pluck('value', 'key')->toArray();
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (! $setting) {
            return $default;
        }
        if ($setting->is_encrypted && $setting->value !== '' && $setting->value !== null) {
            try {
                return Crypt::decryptString($setting->value);
            } catch (\Exception $e) {
                return $default;
            }
        }
        return $setting->value;
    }

    public static function set(
        string $key,
        mixed $value,
        bool $encrypt = false,
        string $group = self::GROUP_GENERAL
    ): void {
        $stored = $encrypt && $value !== '' && $value !== null
            ? Crypt::encryptString((string) $value)
            : (string) ($value ?? '');
        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $stored,
                'is_encrypted' => $encrypt,
                'setting_group' => $group,
            ]
        );
    }

    /**
     * @return \Illuminate\Support\Collection<int, SystemSetting>
     */
    public static function getGroup(string $group): \Illuminate\Support\Collection
    {
        return static::where('setting_group', $group)->get();
    }

    /**
     * @return array<string, string>
     */
    public static function getMailSettings(): array
    {
        return [
            'mail_host' => static::get('mail_host', ''),
            'mail_port' => static::get('mail_port', '587'),
            'mail_username' => static::get('mail_username', ''),
            'mail_password' => static::get('mail_password', ''),
            'mail_encryption' => static::get('mail_encryption', 'tls'),
            'mail_from_name' => static::get('mail_from_name', 'Al Injaz'),
            'mail_from_email' => static::get('mail_from_email', ''),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    public static function getBrandingCache(): array
    {
        return Cache::rememberForever(self::BRANDING_CACHE_KEY, fn () => static::getMany(self::BRANDING_KEYS));
    }

    public static function getFaviconUrl(): ?string
    {
        $raw = static::getBrandingCache();
        $path = $raw['company_favicon'] ?? null;

        return $path && $path !== '' ? asset('storage/' . $path) : null;
    }

    public static function applyMailConfig(): void
    {
        $encryption = static::get('mail_encryption', 'tls');
        $encryptionValue = $encryption === 'none' ? null : $encryption;

        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', static::get('mail_host', ''));
        Config::set('mail.mailers.smtp.port', (int) static::get('mail_port', '587'));
        Config::set('mail.mailers.smtp.username', static::get('mail_username', ''));
        Config::set('mail.mailers.smtp.password', static::get('mail_password', ''));
        Config::set('mail.mailers.smtp.encryption', $encryptionValue);
        Config::set('mail.default', 'smtp');
        Config::set('mail.from.address', static::get('mail_from_email', ''));
        Config::set('mail.from.name', static::get('mail_from_name', 'Al Injaz'));
    }
}
