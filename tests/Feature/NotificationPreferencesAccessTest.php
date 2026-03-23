<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

final class NotificationPreferencesAccessTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function supplier_cannot_access_notification_preferences_by_direct_url(): void
    {
        Role::findOrCreate('supplier');

        $supplierUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Supplier::create([
            'id' => (string) Str::uuid(),
            'supplier_code' => 'SUP-'.strtoupper(Str::random(8)),
            'legal_name_en' => 'Test Supplier',
            'country' => 'SA',
            'city' => 'Riyadh',
            'status' => Supplier::STATUS_APPROVED,
            'is_verified' => true,
            'supplier_user_id' => $supplierUser->id,
        ]);

        $supplierUser->assignRole('supplier');

        $this->actingAs($supplierUser)
            ->get(route('notification-preferences.index'))
            ->assertForbidden();
    }

    #[Test]
    public function internal_user_can_access_notification_preferences(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->get(route('notification-preferences.index'))
            ->assertOk();
    }
}
