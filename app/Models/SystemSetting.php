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
        /** @var array<string, mixed> $smtpConfig */
        $smtpConfig = Config::get('mail.mailers.smtp', []);

        $resolved = [
            'host' => static::currentMailString($smtpConfig['host'] ?? ''),
            'port' => static::currentMailPort($smtpConfig['port'] ?? 587),
            'username' => static::currentMailString($smtpConfig['username'] ?? ''),
            'password' => static::currentMailString($smtpConfig['password'] ?? ''),
            'encryption' => static::normalizeEncryption($smtpConfig['encryption'] ?? null),
            'from_address' => static::currentMailString(Config::get('mail.from.address', '')),
            'from_name' => static::currentMailString(Config::get('mail.from.name', 'Al-Injaz')),
        ];

        if (! app()->environment('local')) {
            $dbHost = static::normalizedMailSetting('mail_host');

            // Production-style DB overrides only apply when SMTP host is explicitly configured.
            if ($dbHost !== null) {
                $resolved['host'] = $dbHost;
                $resolved['port'] = static::validatedMailPort(static::get('mail_port'), $resolved['port']);
                $resolved['username'] = static::normalizedMailSetting('mail_username') ?? $resolved['username'];
                $resolved['password'] = static::normalizedMailSetting('mail_password') ?? $resolved['password'];
                $resolved['encryption'] = static::normalizeEncryption(
                    static::normalizedMailSetting('mail_encryption') ?? $resolved['encryption'],
                );
                $resolved['from_address'] = static::normalizedMailSetting('mail_from_email')
                    ?? static::normalizedMailSetting('mail_from_address')
                    ?? $resolved['from_address'];
                $resolved['from_name'] = static::normalizedMailSetting('mail_from_name') ?? $resolved['from_name'];
            }
        }

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $resolved['host']);
        Config::set('mail.mailers.smtp.port', $resolved['port']);
        Config::set('mail.mailers.smtp.username', $resolved['username']);
        Config::set('mail.mailers.smtp.password', $resolved['password']);
        Config::set('mail.mailers.smtp.encryption', $resolved['encryption']);
        Config::set('mail.from.address', $resolved['from_address']);
        Config::set('mail.from.name', $resolved['from_name']);
    }

    private static function normalizedMailSetting(string $key): ?string
    {
        $value = static::get($key);

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value !== '' ? $value : null;
    }

    private static function currentMailString(mixed $value, string $default = ''): string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : $default;
    }

    private static function currentMailPort(mixed $value, int $default = 587): int
    {
        return static::validatedMailPort($value, $default);
    }

    private static function validatedMailPort(mixed $value, int $fallback): int
    {
        if (is_numeric($value)) {
            $port = (int) $value;

            if ($port > 0) {
                return $port;
            }
        }

        return $fallback;
    }

    private static function normalizeEncryption(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = strtolower(trim($value));

        if ($value === '' || $value === 'none') {
            return null;
        }

        return in_array($value, ['tls', 'ssl'], true) ? $value : null;
    }
}
