<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class UserNotificationChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function authenticated_user_can_authorize_own_private_notification_channel(): void
    {
        $this->withoutMiddleware(VerifyCsrfToken::class);

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post('/broadcasting/auth', [
                'socket_id' => '12345.67890',
                'channel_name' => 'private-users.' . $user->id . '.notifications',
            ]);

        $response->assertOk();
    }

    #[Test]
    public function authenticated_user_cannot_authorize_other_users_private_notification_channel(): void
    {
        $this->withoutMiddleware(VerifyCsrfToken::class);

        $user = User::factory()->create();
        $other = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post('/broadcasting/auth', [
                'socket_id' => '12345.67890',
                'channel_name' => 'private-users.' . $other->id . '.notifications',
            ]);

        $response->assertForbidden();
    }
}

