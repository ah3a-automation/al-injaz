<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
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
    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $request->user() ? [
                'id'                => $request->user()->id,
                'name'              => $request->user()->name,
                'email'             => $request->user()->email,
                'email_verified_at' => $request->user()->email_verified_at,
            ] : null,
        ],
        'userCan' => $request->user() ? [
            'users.view' => $request->user()->can('users.view'),
            'settings.manage' => $request->user()->can('settings.manage'),
            'suppliers.create' => $request->user()->can('suppliers.create'),
        ] : [],
        'notifications' => [
            'unread_count' => $request->user()
                ? (int) $request->user()->unreadNotifications()->count()
                : 0,
        ],
        'locale' => app()->getLocale(),
        'dir'    => app()->getLocale() === 'ar' ? 'rtl' : 'ltr',
        'flash'  => [
            'success' => $request->session()->get('success'),
            'error'   => $request->session()->get('error'),
        ],
    ]);
}
}
