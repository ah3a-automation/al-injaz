<?php

declare(strict_types=1);

namespace App\Application\Users\Queries;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ListUsersQuery
{
    private const ALLOWED_SORT_FIELDS = [
        'name',
        'email',
        'status',
        'department',
        'created_at',
        'last_login_at',
    ];

    public function __construct(
        private readonly ?string $q = null,
        private readonly ?string $status = null,
        private readonly ?string $role = null,
        private readonly ?string $department = null,
        private readonly string $sortField = 'created_at',
        private readonly string $sortDir = 'desc',
        private readonly int $perPage = 25,
        private readonly int $page = 1,
    ) {}

    public function handle(): LengthAwarePaginator
    {
        $sortField = in_array($this->sortField, self::ALLOWED_SORT_FIELDS, true)
            ? $this->sortField
            : 'created_at';
        $sortDir = $this->sortDir === 'asc' ? 'asc' : 'desc';

        return User::query()
            ->with(['roles:id,name', 'creator:id,name'])
            ->when($this->q, fn ($q) => $q->where(fn ($inner) => $inner
                ->where('name', 'ilike', '%' . $this->q . '%')
                ->orWhere('email', 'ilike', '%' . $this->q . '%')
                ->orWhere('department', 'ilike', '%' . $this->q . '%')))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->role, fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('name', $this->role)))
            ->when($this->department, fn ($q) => $q->where('department', $this->department))
            ->orderBy($sortField, $sortDir)
            ->paginate($this->perPage, ['*'], 'page', $this->page);
    }
}
