<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            $user = auth()->user();
            if ($user->status === 'suspended') {
                auth()->logout();
                $request->session()->invalidate();
                return redirect('/login')
                    ->withErrors(['email' => 'Your account has been suspended.']);
            }
            if ($user->status === 'inactive') {
                auth()->logout();
                $request->session()->invalidate();
                return redirect('/login')
                    ->withErrors(['email' => 'Your account is inactive.']);
            }
        }

        return $next($request);
    }
}
