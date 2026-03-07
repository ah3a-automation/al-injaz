<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequirePasswordChange
{
    private const SKIP_ROUTES = ['password.change', 'password.update.forced', 'logout'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        if (in_array($request->route()?->getName(), self::SKIP_ROUTES, true)) {
            return $next($request);
        }

        if (auth()->user()->must_change_password === true) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Password change required.'], 403);
            }
            return redirect()->route('password.change');
        }

        return $next($request);
    }
}
