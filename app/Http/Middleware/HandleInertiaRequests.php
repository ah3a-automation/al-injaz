<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\SystemNotification;
use App\Models\SystemSetting;
use App\Support\SharedInertiaNotificationCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * WebSocket / Echo client config for the browser (may differ from REVERB_HOST used server-side in Docker).
     *
     * Host fallback: current HTTP request host (so Docker can keep REVERB_HOST=reverb for PHP while
     * the browser connects to the same hostname it used to load the page, e.g. localhost).
     *
     * @return array{key: string, host: string, port: int, scheme: 'http'|'https'}|null
     */
    private function sharedReverbClientConfig(Request $request): ?array
    {
        if (config('broadcasting.default') !== 'reverb') {
            return null;
        }

        /** @var array<string, mixed>|null $conn */
        $conn = config('broadcasting.connections.reverb');
        if (! is_array($conn)) {
            return null;
        }

        $key = $conn['key'] ?? null;
        if (! is_string($key) || $key === '') {
            return null;
        }

        $options = $conn['options'] ?? [];
        $defaultPort = 8080;
        if (is_array($options) && isset($options['port'])) {
            $defaultPort = (int) $options['port'];
        }

        $publicHost = env('REVERB_PUBLIC_HOST');
        $host = (is_string($publicHost) && $publicHost !== '')
            ? $publicHost
            : $request->getHost();

        $publicPort = env('REVERB_PUBLIC_PORT');
        $port = ($publicPort !== null && $publicPort !== '')
            ? (int) $publicPort
            : $defaultPort;

        $publicScheme = env('REVERB_PUBLIC_SCHEME');
        $schemeRaw = (is_string($publicScheme) && $publicScheme !== '')
            ? strtolower($publicScheme)
            : strtolower((string) (env('REVERB_SCHEME') ?: 'http'));
        $scheme = $schemeRaw === 'https' ? 'https' : 'http';

        return [
            'key'    => $key,
            'host'   => $host,
            'port'   => $port,
            'scheme' => $scheme,
        ];
    }

    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $avatarUrl = null;

        $raw = SystemSetting::getBrandingCache();

        $locale = app()->getLocale();
        $nameEn = $raw['company_name_en'] ?? $raw['company_name'] ?? 'My Company';
        $nameAr = $raw['company_name_ar'] ?? '';
        $shortEn = $raw['company_short_name_en'] ?? $raw['company_short_name'] ?? 'Company';
        $shortAr = $raw['company_short_name_ar'] ?? '';
        $company = [
            'name_en'            => $nameEn,
            'name_ar'            => $nameAr ?: null,
            'short_name_en'      => $shortEn,
            'short_name_ar'      => $shortAr ?: null,
            'display_name'       => $locale === 'ar' && $nameAr !== '' ? $nameAr : $nameEn,
            'display_short_name' => $locale === 'ar' && $shortAr !== '' ? $shortAr : $shortEn,
            'logo_light'         => isset($raw['company_logo_light']) && $raw['company_logo_light'] !== ''
                ? asset('storage/' . $raw['company_logo_light'])
                : (isset($raw['company_logo']) && $raw['company_logo'] !== '' ? asset('storage/' . $raw['company_logo']) : null),
            'logo_dark'          => isset($raw['company_logo_dark']) && $raw['company_logo_dark'] !== ''
                ? asset('storage/' . $raw['company_logo_dark'])
                : null,
            'sidebar_icon'       => isset($raw['company_sidebar_icon']) && $raw['company_sidebar_icon'] !== ''
                ? asset('storage/' . $raw['company_sidebar_icon'])
                : null,
            'favicon'            => isset($raw['company_favicon']) && $raw['company_favicon'] !== ''
                ? asset('storage/' . $raw['company_favicon'])
                : null,
            'phone'              => $raw['company_phone'] ?? null,
            'email'              => $raw['company_email'] ?? null,
            'website'            => $raw['company_website'] ?? null,
            'address'            => $raw['company_address'] ?? null,
            'sidebar_brand_mode' => $raw['sidebar_brand_mode'] ?? 'logo_text',
            'brand_primary_color'   => $raw['brand_primary_color'] ?? '#373d42',
            'brand_secondary_color' => $raw['brand_secondary_color'] ?? '#bfa849',
            'color_success'         => $raw['color_success'] ?? '#16a34a',
            'color_warning'         => $raw['color_warning'] ?? '#d97706',
            'color_danger'          => $raw['color_danger'] ?? '#dc2626',
            'color_info'            => $raw['color_info'] ?? '#2563eb',
            'color_sidebar_bg'      => $raw['color_sidebar_bg'] ?? '#373d42',
            'color_sidebar_text'    => $raw['color_sidebar_text'] ?? '#ffffff',
        ];

        if ($user) {
            if ($user->hasRole('supplier')) {
                $supplier = $user->supplierProfile;
                if ($supplier) {
                    $supplier->load(['contacts.media']);
                    $contact = $supplier->contacts()->where('is_primary', true)->first()
                        ?? $supplier->contacts()->orderBy('created_at')->first();
                    if ($contact) {
                        $avatarUrl = $contact->getFirstMediaUrl('avatar')
                            ?: ($contact->avatar_path ? route('supplier.contact.media', [$contact->id, 'avatar']) : null);
                    }
                }
            } else {
                $user->load('media');
                $avatarUrl = $user->getFirstMediaUrl('avatar') ?: ($user->avatar_path ? route('profile.avatar') : null);
            }
        }

        // ── Notifications — shared for ALL authenticated users ────────────────
        // Used by: NotificationBell (admin/AppLayout) + SupplierPortalLayout bell.
        // Single query set; reused for both `notifications.unread_count` and the
        // dedicated supplier-portal props to avoid duplicate DB hits.
        $unreadNotificationsCount = 0;
        $recentNotifications = [];

        if ($user) {
            $bell = Cache::remember(
                SharedInertiaNotificationCache::cacheKey((int) $user->id),
                25,
                function () use ($user) {
                    $unreadNotificationsCount = SystemNotification::query()
                        ->where('user_id', $user->id)
                        ->where('status', '!=', SystemNotification::STATUS_READ)
                        ->count();

                    $recentNotifications = SystemNotification::query()
                        ->where('user_id', $user->id)
                        ->latest('created_at')
                        ->limit(5)
                        ->get(['id', 'event_key', 'title', 'message', 'link', 'status', 'created_at'])
                        ->map(fn ($n) => [
                            'id'        => (string) $n->id,
                            'event_key' => $n->event_key,
                            'title'     => $n->title,
                            'message'   => $n->message,
                            'link'      => $n->link,
                            'isUnread'  => $n->status !== SystemNotification::STATUS_READ,
                            'timeAgo'   => $n->created_at->diffForHumans(),
                        ])
                        ->values()
                        ->all();

                    return [
                        'unread_count' => $unreadNotificationsCount,
                        'recent'       => $recentNotifications,
                    ];
                }
            );

            $unreadNotificationsCount = $bell['unread_count'];
            $recentNotifications = $bell['recent'];
        }
        // ─────────────────────────────────────────────────────────────────────

        return array_merge(parent::share($request), [
            'reverb' => $this->sharedReverbClientConfig($request),
            'company' => $company,
            'auth' => [
                'user' => $user ? [
                    'id'                => $user->id,
                    'name'              => $user->name,
                    'email'             => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'avatar_url'        => $avatarUrl,
                    'profile_photo_url' => $avatarUrl,
                ] : null,
            ],
            'userCan' => $request->user() ? [
                'users.view' => $request->user()->can('users.view'),
                'settings.manage' => $request->user()->can('settings.manage'),
                'suppliers.create' => $request->user()->can('suppliers.create'),
                'company.branding.manage' => $request->user()->can('company.branding.manage'),
                'categories.manage' => $request->user()->can('categories.manage'),
                'capabilities.manage' => $request->user()->can('capabilities.manage'),
                'certifications.manage' => $request->user()->can('certifications.manage'),
                'contract.manage' => $request->user()->can('contract.manage'),
                'contract.variation.approve' => $request->user()->can('contract.variation.approve'),
                'contract.invoice.approve' => $request->user()->can('contract.invoice.approve'),
                'contract.invoice.pay' => $request->user()->can('contract.invoice.pay'),
            ] : [],
            // Reuse the already-computed count — no extra DB query.
            'notifications' => [
                'unread_count' => $unreadNotificationsCount,
            ],
            'unreadNotificationsCount' => $unreadNotificationsCount,
            'recentNotifications'      => $recentNotifications,
            'locale' => app()->getLocale(),
            'dir'    => app()->getLocale() === 'ar' ? 'rtl' : 'ltr',
            'translations' => [
                'ui'                => trans('ui'),
                'nav'               => trans('nav'),
                'dashboard'         => trans('dashboard'),
                'suppliers'         => trans('suppliers'),
                'supplier_categories' => trans('supplier_categories'),
                'admin'             => trans('admin'),
                'rfqs'              => trans('rfqs'),
                'packages'          => trans('packages'),
                'tasks'             => trans('tasks'),
                'purchase_requests' => trans('purchase_requests'),
                'supplier_portal'   => trans('supplier_portal'),
                'activity'          => trans('activity'),
                'documents'         => trans('documents'),
                'contracts'         => trans('contracts'),
                'contract_articles' => trans('contract_articles'),
                'contract_templates'=> trans('contract_templates'),
            ],
            'flash'  => [
                'success'   => $request->session()->get('success'),
                'error'     => $request->session()->get('error'),
                'warning'   => $request->session()->get('warning'),
                'scroll_to' => $request->session()->get('scroll_to'),
            ],
        ]);
    }
}
