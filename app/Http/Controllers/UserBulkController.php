<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class UserBulkController extends Controller
{
    public function destroy(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', User::class);

        if (! $request->user()->can('users.delete')) {
            abort(403);
        }

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        User::query()
            ->whereIn('id', $validated['ids'])
            ->where('id', '!=', $request->user()->id)
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->delete();

        return redirect()->route('settings.users.index')->with('success', 'Selected users deleted.');
    }
}
