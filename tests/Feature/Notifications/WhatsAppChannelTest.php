<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Application\Notifications\SendWhatsAppNotificationAction;
use App\Models\User;
use App\Notifications\BaseAppNotification;
use App\Notifications\Channels\WhatsAppChannel;
use App\Services\WhatsApp\EvolutionApiClient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

final class WhatsAppChannelTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_action_calls_client_with_normalized_phone(): void
    {
        config([
            'services.evolution.url' => 'http://evolution.test',
            'services.evolution.key' => 'k',
            'services.evolution.instance' => 'i',
        ]);

        $user = User::factory()->create(['phone' => '0501234567']);

        $mock = Mockery::mock(EvolutionApiClient::class);
        $mock->shouldReceive('sendText')
            ->once()
            ->with('966501234567', 'Hello WA');

        $this->app->instance(EvolutionApiClient::class, $mock);

        $notification = new class extends BaseAppNotification
        {
            public function getEventCode(): string
            {
                return 'test.whatsapp';
            }

            protected function getVariables(): array
            {
                return [];
            }

            protected function getLink(): ?string
            {
                return null;
            }

            public function getNotifiable(): ?Model
            {
                return null;
            }

            public function toWhatsApp(object $notifiable): string
            {
                return 'Hello WA';
            }
        };

        $action = $this->app->make(SendWhatsAppNotificationAction::class);
        $action->execute($user, $notification);

        Mockery::close();
        $this->assertTrue(true);
    }

    public function test_send_action_skips_when_no_phone(): void
    {
        $mock = Mockery::mock(EvolutionApiClient::class);
        $mock->shouldReceive('sendText')->never();
        $this->app->instance(EvolutionApiClient::class, $mock);

        $user = User::factory()->create(['phone' => null]);

        $notification = new class extends BaseAppNotification
        {
            public function getEventCode(): string
            {
                return 'test.whatsapp';
            }

            protected function getVariables(): array
            {
                return [];
            }

            protected function getLink(): ?string
            {
                return null;
            }

            public function getNotifiable(): ?Model
            {
                return null;
            }

            public function toWhatsApp(object $notifiable): string
            {
                return 'Hello WA';
            }
        };

        $action = $this->app->make(SendWhatsAppNotificationAction::class);
        $action->execute($user, $notification);

        Mockery::close();
        $this->assertTrue(true);
    }

    public function test_whatsapp_channel_never_throws_when_client_errors(): void
    {
        $mock = Mockery::mock(EvolutionApiClient::class);
        $mock->shouldReceive('sendText')->andThrow(new \RuntimeException('network'));
        $this->app->instance(EvolutionApiClient::class, $mock);

        $user = User::factory()->create(['phone' => '0501234567']);

        $notification = new class extends BaseAppNotification
        {
            public function getEventCode(): string
            {
                return 'test.whatsapp';
            }

            protected function getVariables(): array
            {
                return [];
            }

            protected function getLink(): ?string
            {
                return null;
            }

            public function getNotifiable(): ?Model
            {
                return null;
            }

            public function toWhatsApp(object $notifiable): string
            {
                return 'Hello WA';
            }
        };

        $action = new SendWhatsAppNotificationAction($mock);
        $channel = new WhatsAppChannel($action);
        $channel->send($user, $notification);

        $this->assertTrue(true);
        Mockery::close();
    }
}
