<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Users\Commands\CreateUserCommand;
use App\Application\Users\Commands\DeleteUserCommand;
use App\Application\Users\Commands\SuspendUserCommand;
use App\Application\Users\Commands\UpdateUserCommand;
use App\Application\Users\Queries\GetUserQuery;
use App\Application\Users\Queries\ListUsersQuery;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

final class UserController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $query = new ListUsersQuery(
            q: $request->input('q'),
            status: $request->input('status'),
            role: $request->input('role'),
            department: $request->input('department'),
            sortField: (string) $request->input('sort_field', 'created_at'),
            sortDir: (string) $request->input('sort_dir', 'desc'),
            perPage: (int) $request->input('per_page', 25),
            page: (int) $request->input('page', 1),
        );
        $users = $query->handle();

        $roles = Role::orderBy('name')->get(['id', 'name']);
        $departments = User::query()->distinct()->orderBy('department')->pluck('department')->filter()->values();

        $authUser = $request->user();
        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => [
                'q' => $request->input('q'),
                'status' => $request->input('status'),
                'role' => $request->input('role'),
                'department' => $request->input('department'),
                'sort_field' => $request->input('sort_field', 'created_at'),
                'sort_dir' => $request->input('sort_dir', 'desc'),
                'page' => $request->input('page', 1),
                'per_page' => $request->input('per_page', 25),
            ],
            'roles' => $roles,
            'departments' => $departments,
            'can' => [
                'create' => $authUser->can('users.create'),
                'update' => $authUser->can('users.edit'),
                'delete' => $authUser->can('users.delete'),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', User::class);

        $roles = Role::whereNotIn('name', ['super_admin'])->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Users/Create', [
            'roles' => $roles,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
            'role' => ['required', 'string', 'exists:roles,name'],
            'department' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'string', 'in:active,inactive,suspended'],
            'must_change_password' => ['nullable', 'boolean'],
        ]);

        $command = new CreateUserCommand(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'],
            role: $validated['role'],
            status: $validated['status'] ?? User::STATUS_ACTIVE,
            mustChangePassword: $validated['must_change_password'] ?? true,
            phone: $validated['phone'] ?? null,
            department: $validated['department'] ?? null,
            createdByUserId: $request->user()->id,
        );
        $user = $command->handle();

        $this->activityLogger->log('users.user.created', $user, [], $user->toArray(), $request->user());

        return redirect()->route('users.show', $user)->with('success', 'User created.');
    }

    public function show(Request $request, User $user): Response
    {
        $this->authorize('view', $user);

        $getQuery = new GetUserQuery($user->id);
        $user = $getQuery->handle();

        $role = $user->roles->first();
        $permissions = $role ? $role->getAllPermissions()->pluck('name')->values()->all() : [];

        return Inertia::render('Users/Show', [
            'user' => $user,
            'rolePermissions' => $permissions,
            'can' => [
                'update' => $request->user()->can('update', $user),
                'delete' => $request->user()->can('delete', $user),
            ],
        ]);
    }

    public function edit(Request $request, User $user): Response
    {
        $this->authorize('update', $user);

        if ($user->hasRole('super_admin') && ! $request->user()->hasRole('super_admin')) {
            abort(403);
        }

        $roles = Role::whereNotIn('name', ['super_admin'])->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Users/Edit', [
            'user' => $user,
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        if ($user->hasRole('super_admin') && ! $request->user()->hasRole('super_admin')) {
            abort(403);
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
            'role' => ['required', 'string', 'exists:roles,name'],
            'department' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'status' => ['required', 'string', 'in:active,inactive,suspended'],
            'must_change_password' => ['nullable', 'boolean'],
        ];
        $validated = $request->validate($rules);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'department' => $validated['department'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'],
            'must_change_password' => $validated['must_change_password'] ?? false,
        ];
        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $command = new UpdateUserCommand($user, $data, $validated['role']);
        $user = $command->handle();

        $this->activityLogger->log('users.user.updated', $user, [], $user->toArray(), $request->user());

        return redirect()->route('users.show', $user)->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $payload = $user->toArray();
        $command = new DeleteUserCommand($user, $request->user()->id);
        $command->handle();

        $this->activityLogger->log('users.user.deleted', $user, $payload, [], $request->user());

        return redirect()->route('users.index')->with('success', 'User deleted.');
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,inactive,suspended'],
        ]);

        $command = new SuspendUserCommand($user, $validated['status']);
        $user = $command->handle();

        $this->activityLogger->log('users.user.status_changed', $user, [], $user->toArray(), $request->user());

        return redirect()->back()->with('success', 'User status updated.');
    }
}
