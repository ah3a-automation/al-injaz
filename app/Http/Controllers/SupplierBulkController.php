<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;

final class SupplierBulkController extends Controller
{
    public function destroy(Request $request): RedirectResponse
    {
        if (! $request->user()->can('suppliers.delete')) {
            abort(403);
        }

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['uuid', 'exists:suppliers,id'],
        ]);

        $ids = $request->input('ids', []);
        Supplier::query()->whereIn('id', $ids)->delete();
        Cache::forget(Supplier::COUNTRIES_CACHE_KEY);

        return redirect()->route('suppliers.index')->with('success', count($ids) . ' suppliers deleted.');
    }
}
