<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        channels: __DIR__.'/../routes/channels.php',
        // `web` is required (session, cookies); `auth` authorizes private channels. Do not use `auth` alone.
        attributes: ['middleware' => ['web', 'auth']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\SetLocale::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'ensure.active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'require.password.change' => \App\Http\Middleware\RequirePasswordChange::class,
            'ensure.supplier.approved' => \App\Http\Middleware\EnsureSupplierIsApproved::class,
            'ensure.role.supplier' => \App\Http\Middleware\EnsureUserIsSupplier::class,
            'ensure.not.supplier' => \App\Http\Middleware\EnsureUserIsNotSupplier::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
