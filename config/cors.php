<?php

declare(strict_types=1);

/*
 * CORS — never use allowed_origins: ['*'] with supports_credentials: true.
 * Set CORS_ALLOWED_ORIGINS to a comma-separated list of exact origins, e.g.:
 *   https://app.example.com,https://www.example.com
 * Leave empty to deny cross-origin browser requests (safe default for same-origin apps).
 */

$origins = env('CORS_ALLOWED_ORIGINS', '');
$allowedOrigins = $origins === ''
    ? []
    : array_values(array_filter(array_map('trim', explode(',', $origins))));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
