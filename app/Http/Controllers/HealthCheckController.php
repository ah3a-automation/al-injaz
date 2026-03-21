<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Deep health check for load balancers / monitoring (not the lightweight /up probe).
 */
final class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'app' => 'ok',
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'cache' => $this->checkCache(),
        ];

        if (config('health.check_horizon', false)) {
            $checks['horizon'] = $this->checkHorizon();
        }

        if (config('health.check_reverb', false)) {
            $checks['reverb'] = $this->checkReverb();
        }

        $required = ['database', 'redis', 'cache'];
        $ok = true;
        foreach ($required as $key) {
            if (($checks[$key] ?? '') !== 'ok') {
                $ok = false;
                break;
            }
        }

        if ($ok && config('health.check_horizon', false) && ($checks['horizon'] ?? 'ok') !== 'ok') {
            $ok = false;
        }

        if ($ok && config('health.check_reverb', false)) {
            $rev = $checks['reverb'] ?? 'skipped';
            if ($rev !== 'ok' && $rev !== 'skipped') {
                $ok = false;
            }
        }

        return response()->json(
            [
                'status' => $ok ? 'healthy' : 'degraded',
                'checks' => $checks,
                'timestamp' => now()->toIso8601String(),
            ],
            $ok ? 200 : 503
        );
    }

    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();

            return 'ok';
        } catch (Throwable) {
            return 'fail';
        }
    }

    private function checkRedis(): string
    {
        try {
            Redis::connection()->ping();

            return 'ok';
        } catch (Throwable) {
            return 'fail';
        }
    }

    private function checkCache(): string
    {
        try {
            $key = 'health:'.bin2hex(random_bytes(8));
            Cache::put($key, '1', 5);
            $hit = Cache::get($key);
            Cache::forget($key);

            return $hit === '1' ? 'ok' : 'fail';
        } catch (Throwable) {
            return 'fail';
        }
    }

    private function checkHorizon(): string
    {
        try {
            $code = Artisan::call('horizon:status');

            return $code === 0 ? 'ok' : 'fail';
        } catch (Throwable) {
            return 'fail';
        }
    }

    private function checkReverb(): string
    {
        $url = config('health.reverb_url');
        if (! is_string($url) || $url === '') {
            return 'skipped';
        }

        try {
            $response = Http::timeout(2)->connectTimeout(2)->get($url);

            return ($response->successful() || $response->status() === 404) ? 'ok' : 'fail';
        } catch (Throwable) {
            return 'fail';
        }
    }
}
