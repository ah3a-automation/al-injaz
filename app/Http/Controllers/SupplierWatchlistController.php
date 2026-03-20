<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierWatchlist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class SupplierWatchlistController extends Controller
{

    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('view', $supplier);
        $user = $request->user();
        if ($user->watchlistedSuppliers()->where('suppliers.id', $supplier->id)->exists()) {
            return redirect()->back()->with('info', 'Supplier is already on your watchlist.');
        }
        SupplierWatchlist::create([
            'user_id' => $user->id,
            'supplier_id' => $supplier->id,
            'notes' => $request->input('notes'),
        ]);
        return redirect()->back()->with('success', 'Supplier added to watchlist.');
    }

    public function destroy(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('view', $supplier);
        $request->user()->watchlistedSuppliers()->detach($supplier->id);
        return redirect()->back()->with('success', 'Supplier removed from watchlist.');
    }
}
