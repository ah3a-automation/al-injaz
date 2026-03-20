<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\ActivityLogger;
use App\Support\RoleGovernance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class RoleController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $roles = Role::with('permissions:id,name')
            ->withCount('permissions')
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name']);

        $permissions = Permission::orderBy('name')->get(['id', 'name', 'guard_name']);

        $permissionGroups = $permissions->groupBy(function (Permission $p): string {
            return str_contains($p->name, '.') ? explode('.', $p->name)[0] : 'general';
        })->map(function ($perms, string $key) {
            return [
                'key' => $key,
                'label' => ucfirst(str_replace(['-', '_'], ' ', $key)),
                'permissions' => $perms->map(fn (Permission $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                ])->values()->all(),
            ];
        })->values()->all();

        return Inertia::render('Settings/Roles/Index', [
            'roles' => $roles->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
                'permissions_count' => $role->permissions_count,
                'isProtected' => RoleGovernance::isProtected($role->name),
                'isHighPrivilege' => RoleGovernance::isHighPrivilege($role->name),
            ])->values()->all(),
            'permissions' => $permissions->map(fn (Permission $perm) => [
                'id' => $perm->id,
                'name' => $perm->name,
                'guard_name' => $perm->guard_name,
            ])->values()->all(),
            'permissionGroups' => $permissionGroups,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => config('auth.defaults.guard', 'web'),
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        $this->activityLogger->log('roles.role.created', $role, [], $role->toArray(), $request->user());

        return redirect()->route('settings.roles.index')->with('success', 'Role created.');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (RoleGovernance::isProtected($role->name) && $request->input('name') !== $role->name) {
            return back()->withErrors(['name' => __('admin.role_cannot_be_renamed')]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name,' . $role->id],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $oldName = $role->getOriginal('name');
        $role->name = $validated['name'];
        $role->save();

        $role->syncPermissions($validated['permissions'] ?? []);

        $this->activityLogger->log('roles.role.updated', $role, ['name' => $oldName], $role->getChanges(), $request->user());
        $this->activityLogger->log('roles.role.permissions_updated', $role, [], ['permissions' => $validated['permissions'] ?? []], $request->user());

        return redirect()->route('settings.roles.index')->with('success', 'Role updated.');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        if (RoleGovernance::isProtected($role->name)) {
            return back()->withErrors(['role' => __('admin.role_cannot_be_deleted')]);
        }

        if ($role->users()->exists()) {
            return redirect()->route('settings.roles.index')
                ->with('error', 'Cannot delete a role that is assigned to users.');
        }

        $this->activityLogger->log('roles.role.deleted', $role, $role->toArray(), [], $request->user());
        $role->delete();

        return redirect()->route('settings.roles.index')->with('success', 'Role deleted.');
    }

    public function audit(Request $request): Response
    {
        if (! $request->user()->can('settings.manage')) {
            abort(403);
        }

        $roles = Role::orderBy('name')->get(['id', 'name']);

        $permissions = Permission::with('roles:id')
            ->orderBy('name')
            ->get(['id', 'name']);

        $grouped = $permissions->groupBy(function (Permission $permission): string {
            if (str_contains($permission->name, '.')) {
                return explode('.', $permission->name)[0];
            }

            return 'general';
        });

        $permissionGroups = $grouped->map(function ($perms, string $groupKey) {
            $label = ucfirst(str_replace(['-', '_'], ' ', $groupKey));

            return [
                'key' => $groupKey,
                'label' => $label,
                'permissions' => $perms->map(static fn (Permission $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'assignedRoleIds' => $p->roles->pluck('id')->values()->all(),
                ])->values()->all(),
            ];
        })->values()->all();

        return Inertia::render('Settings/Roles/Audit', [
            'roles' => $roles->map(static fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
            ])->values()->all(),
            'permissionGroups' => $permissionGroups,
        ]);
    }
}

