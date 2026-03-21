<?php

declare(strict_types=1);

return [

    'headers' => [
        'enabled' => env('SECURITY_HEADERS_ENABLED', true),
        'x_frame_options' => env('SECURITY_X_FRAME_OPTIONS', 'SAMEORIGIN'),
        'referrer_policy' => env('SECURITY_REFERRER_POLICY', 'strict-origin-when-cross-origin'),
        /*
         * Feature policy / Permissions-Policy (subset; adjust for your deployment).
         * Empty string = header omitted.
         */
        'permissions_policy' => env(
            'SECURITY_PERMISSIONS_POLICY',
            'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
        ),
    ],

    /*
     * Content-Security-Policy — disabled by default to avoid breaking existing assets.
     * Enable in staging first with SECURITY_CSP_REPORT_ONLY=true, then tighten.
     *
     * Typical Inertia + Vite build needs script-src/style-src unsafe-inline for some setups;
     * prefer hashed nonces in a future hardening pass.
     */
    'csp' => [
        'enabled' => env('SECURITY_CSP_ENABLED', false),
        'report_only' => env('SECURITY_CSP_REPORT_ONLY', true),
        'policy' => env('SECURITY_CSP_POLICY', implode(' ', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https: wss: ws:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ])),
    ],
];
