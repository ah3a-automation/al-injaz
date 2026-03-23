<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Regression: internal ERP routes use ensure.not.supplier; suppliers must get 403 on direct URL access.
 */
final class InternalRoutesSupplierBlockTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return list<array{0: string, 1?: array<string, mixed>}>
     */
    public static function internalRouteProvider(): array
    {
        return [
            'dashboard' => ['dashboard', []],
            'exports index' => ['exports.index', []],
            'suppliers index' => ['suppliers.index', []],
            'search' => ['search.global', ['q' => 'test']],
            'contract articles' => ['contract-articles.index', []],
            'notification preferences' => ['notification-preferences.index', []],
            'rfqs index' => ['rfqs.index', []],
            'contracts index' => ['contracts.index', []],
        ];
    }

    #[Test]
    #[DataProvider('internalRouteProvider')]
    public function supplier_receives_forbidden_on_internal_erp_routes(string $routeName, array $params): void
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
            ->get(route($routeName, $params))
            ->assertForbidden();
    }
}
