<?php

declare(strict_types=1);

/*
| Reverb compares the WebSocket HTTP Host header to `servers.*.hostname`.
| Must be the hostname browsers use (e.g. al-injaz.test), not the Docker service name in REVERB_HOST.
*/
$reverbServerHostname = env('REVERB_SERVER_HOSTNAME');
if (! is_string($reverbServerHostname) || $reverbServerHostname === '') {
    $parsedHost = parse_url((string) env('APP_URL', 'http://127.0.0.1'), PHP_URL_HOST);
    $reverbServerHostname = (is_string($parsedHost) && $parsedHost !== '') ? $parsedHost : '127.0.0.1';
}

return [
    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => (int) env('REVERB_SERVER_PORT', 8080),
            'hostname' => $reverbServerHostname,
            'options' => [],
            'max_request_size' => (int) env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => false,
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => (int) env('REDIS_PORT', 6379),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => (int) env('REDIS_DB', 0),
                ],
            ],
            'pulse_ingest_interval' => (int) env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => (int) env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],
    ],

    'apps' => [
        'provider' => 'config',
        'apps' => [
            [
                'key' => env('REVERB_APP_KEY'),
                'secret' => env('REVERB_APP_SECRET'),
                'app_id' => env('REVERB_APP_ID'),
                'options' => [
                    'host' => env('REVERB_HOST', '127.0.0.1'),
                    'port' => (int) env('REVERB_PORT', 8080),
                    'scheme' => env('REVERB_SCHEME', 'http'),
                    'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
                ],
                'allowed_origins' => ['*'],
                'ping_interval' => (int) env('REVERB_APP_PING_INTERVAL', 60),
                'activity_timeout' => (int) env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'max_message_size' => (int) env('REVERB_APP_MAX_MESSAGE_SIZE', 10_000),
            ],
        ],
    ],
];

