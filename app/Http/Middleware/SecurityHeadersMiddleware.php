<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds security headers for production hardening.
 * CSP is intentionally conservative; tune via config/security.php and env.
 */
final class SecurityHeadersMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! config('security.headers.enabled', true)) {
            return $response;
        }

        $response->headers->set('X-Frame-Options', config('security.headers.x_frame_options', 'SAMEORIGIN'));
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set(
            'Referrer-Policy',
            config('security.headers.referrer_policy', 'strict-origin-when-cross-origin')
        );

        $permissionsPolicy = config('security.headers.permissions_policy');
        if (is_string($permissionsPolicy) && $permissionsPolicy !== '') {
            $response->headers->set('Permissions-Policy', $permissionsPolicy);
        }

        if (config('security.csp.enabled', false)) {
            $csp = (string) config('security.csp.policy', '');
            if ($csp !== '') {
                $header = config('security.csp.report_only', false)
                    ? 'Content-Security-Policy-Report-Only'
                    : 'Content-Security-Policy';
                $response->headers->set($header, $csp);
            }
        }

        return $response;
    }
}
