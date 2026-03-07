<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierContact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SupplierContactController extends Controller
{
    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'is_primary' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($supplier, $validated) {
            if (! empty($validated['is_primary'])) {
                SupplierContact::where('supplier_id', $supplier->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
            SupplierContact::create([
                'id' => (string) Str::uuid(),
                'supplier_id' => $supplier->id,
                'name' => $validated['name'],
                'job_title' => $validated['job_title'] ?? null,
                'department' => $validated['department'] ?? null,
                'contact_type' => $validated['contact_type'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'mobile' => $validated['mobile'] ?? null,
                'is_primary' => (bool) ($validated['is_primary'] ?? false),
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return redirect()->back()->with('success', 'Contact added.');
    }

    public function update(Request $request, Supplier $supplier, SupplierContact $contact): RedirectResponse
    {
        $this->authorize('update', $supplier);

        if ($contact->supplier_id !== $supplier->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'is_primary' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($supplier, $contact, $validated) {
            if (! empty($validated['is_primary'])) {
                SupplierContact::where('supplier_id', $supplier->id)
                    ->where('id', '!=', $contact->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
            $contact->update($validated);
        });

        return redirect()->back()->with('success', 'Contact updated.');
    }

    public function destroy(Request $request, Supplier $supplier, SupplierContact $contact): RedirectResponse
    {
        $this->authorize('update', $supplier);

        if ($contact->supplier_id !== $supplier->id) {
            abort(404);
        }

        $contact->delete();

        return redirect()->back()->with('success', 'Contact deleted.');
    }
}
