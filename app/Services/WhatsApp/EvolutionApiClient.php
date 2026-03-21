<?php

declare(strict_types=1);

namespace App\Services\WhatsApp;

use App\Support\WhatsAppPhoneNormalizer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class EvolutionApiClient
{
    public function sendText(string $phone, string $message): bool
    {
        $baseUrl = $this->baseUrl();
        $apiKey = $this->apiKey();
        $instance = $this->instanceName();

        if ($baseUrl === '') {
            Log::debug('Evolution API: EVOLUTION_API_URL / config services.evolution.url is empty; skip send.');

            return false;
        }

        if ($apiKey === '' || $instance === '') {
            Log::warning('Evolution API: missing API key or instance name; skip send.', [
                'has_key' => $apiKey !== '',
                'has_instance' => $instance !== '',
            ]);

            return false;
        }

        $normalized = WhatsAppPhoneNormalizer::normalize($phone);
        if ($normalized === '') {
            Log::warning('Evolution API: phone normalized to empty string.', [
                'original' => $phone,
            ]);

            return false;
        }

        $url = rtrim($baseUrl, '/') . '/message/sendText/' . rawurlencode($instance);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($url, [
                    'number' => $normalized,
                    'text' => $message,
                ]);

            if ($response->successful() && in_array($response->status(), [200, 201], true)) {
                return true;
            }

            Log::warning('Evolution API: sendText failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (Throwable $e) {
            Log::warning('Evolution API: sendText exception.', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Best-effort reachability check (Evolution v2 instance state).
     */
    public function checkConnection(): bool
    {
        $baseUrl = $this->baseUrl();
        $apiKey = $this->apiKey();
        $instance = $this->instanceName();

        if ($baseUrl === '' || $apiKey === '' || $instance === '') {
            return false;
        }

        $url = rtrim($baseUrl, '/') . '/instance/connectionState/' . rawurlencode($instance);

        try {
            $response = Http::timeout(5)
                ->withHeaders([
                    'apikey' => $apiKey,
                    'Accept' => 'application/json',
                ])
                ->get($url);

            return $response->successful();
        } catch (Throwable $e) {
            Log::debug('Evolution API: connection check failed.', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function baseUrl(): string
    {
        return trim((string) config('services.evolution.url', ''));
    }

    private function apiKey(): string
    {
        return trim((string) config('services.evolution.key', ''));
    }

    private function instanceName(): string
    {
        return trim((string) config('services.evolution.instance', ''));
    }
}
