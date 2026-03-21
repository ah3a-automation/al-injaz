<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\WhatsApp\EvolutionApiClient;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class EvolutionApiClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.evolution.url', 'http://evolution.test');
        Config::set('services.evolution.key', 'secret-key');
        Config::set('services.evolution.instance', 'default');
    }

    public function test_send_text_posts_expected_payload_and_returns_true_on_200(): void
    {
        Http::fake([
            'http://evolution.test/message/sendText/default' => Http::response(['ok' => true], 200),
        ]);

        $client = new EvolutionApiClient;
        $ok = $client->sendText('0501234567', 'Hello');

        $this->assertTrue($ok);
        Http::assertSent(function ($request): bool {
            $data = $request->data();

            return $request->url() === 'http://evolution.test/message/sendText/default'
                && $request->hasHeader('apikey', 'secret-key')
                && ($data['number'] ?? null) === '966501234567'
                && ($data['text'] ?? null) === 'Hello';
        });
    }

    public function test_returns_false_when_url_empty_without_throwing(): void
    {
        Config::set('services.evolution.url', '');

        $client = new EvolutionApiClient;
        $this->assertFalse($client->sendText('966501234567', 'x'));
    }

    public function test_returns_false_on_http_error(): void
    {
        Http::fake([
            'http://evolution.test/message/sendText/default' => Http::response('err', 500),
        ]);

        $client = new EvolutionApiClient;
        $this->assertFalse($client->sendText('966501234567', 'Hello'));
    }
}
