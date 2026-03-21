<?php

declare(strict_types=1);

return [

    /*
    | Optional deep checks for /health (beyond DB + Redis + cache).
    | Enable only when the same container can reach Horizon CLI / Reverb HTTP.
    */
    'check_horizon' => env('HEALTH_CHECK_HORIZON', false),

    'check_reverb' => env('HEALTH_CHECK_REVERB', false),

    /** Internal URL to probe (e.g. http://reverb:8080 when Reverb exposes HTTP). */
    'reverb_url' => env('HEALTH_REVERB_URL'),
];
