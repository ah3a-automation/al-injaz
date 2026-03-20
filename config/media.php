<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | CDN URL
    |--------------------------------------------------------------------------
    | If set, media URLs will be served via this CDN base URL.
    | Example: https://cdn.example.com
    | Leave null to use default storage URL.
    */
    'cdn_url' => env('MEDIA_CDN_URL'),

    /*
    |--------------------------------------------------------------------------
    | Signed URL expiration (minutes)
    |--------------------------------------------------------------------------
    */
    'signed_expiration_minutes' => (int) env('MEDIA_SIGNED_EXPIRATION_MINUTES', 15),
];
