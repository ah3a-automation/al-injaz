<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SupplierCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

final class SupplierCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $categories = SupplierCategory::withCount(['suppliers', 'capabilities'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(50);

        return Inertia::render('Suppliers/Categories/Index', [
            'categories' => $categories,
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
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'supplier_categories');
        SupplierCategory::create([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Category created.');
    }

    public function update(Request $request, SupplierCategory $supplier_category): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'supplier_categories', $supplier_category->id);
        $supplier_category->update([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Category updated.');
    }

    public function destroy(Request $request, SupplierCategory $supplier_category): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $supplier_category->delete();

        return redirect()->back()->with('success', 'Category deleted.');
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
