<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SupplierCapability;
use App\Models\SupplierCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

final class SupplierCapabilityController extends Controller
{
    public function index(Request $request): Response
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $query = SupplierCapability::with('category')
            ->orderBy('category_id')
            ->orderBy('sort_order');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        $capabilities = $query->paginate(50);
        $categories = SupplierCategory::selectable()->orderBy('code')->get(['id', 'code', 'name_en', 'name_ar']);

        return Inertia::render('Suppliers/Capabilities/Index', [
            'capabilities' => $capabilities,
            'categories' => $categories,
            'filters' => [
                'category_id' => $request->input('category_id'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'category_id' => ['required', 'uuid', 'exists:supplier_categories,id'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'supplier_capabilities');
        SupplierCapability::create([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'category_id' => $validated['category_id'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Capability created.');
    }

    public function update(Request $request, SupplierCapability $supplier_capability): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'category_id' => ['required', 'uuid', 'exists:supplier_categories,id'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'supplier_capabilities', $supplier_capability->id);
        $supplier_capability->update([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'category_id' => $validated['category_id'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Capability updated.');
    }

    public function destroy(Request $request, SupplierCapability $supplier_capability): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $supplier_capability->delete();

        return redirect()->back()->with('success', 'Capability deleted.');
    }

    private function generateUniqueSlug(string $name, string $table, ?int $excludeId = null): string
    {
        $slug = Str::slug($name);
        $original = $slug;
        $i = 2;
        while (DB::table($table)->where('slug', $slug)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->exists()) {
            $slug = $original . '-' . $i++;
        }
        return $slug;
    }
}
