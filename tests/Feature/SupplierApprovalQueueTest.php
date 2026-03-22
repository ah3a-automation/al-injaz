<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

final class SupplierApprovalQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_view_supplier_approval_queue(): void
    {
        $this->get(route('suppliers.approval-queue'))->assertRedirect();
    }

    public function test_user_without_approve_permission_cannot_view_approval_queue(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('suppliers.approval-queue'))->assertForbidden();
    }

    public function test_user_with_approve_permission_can_view_approval_queue(): void
    {
        $permission = Permission::findOrCreate('suppliers.approve', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo($permission);

        $this->actingAs($user)
            ->get(route('suppliers.approval-queue'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Suppliers/ApprovalQueue'));
    }
}
