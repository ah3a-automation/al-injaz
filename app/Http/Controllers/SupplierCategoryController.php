<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\SupplierCategoriesExport;
use App\Exports\SupplierCategoryTemplateExport;
use App\Imports\SupplierCategoriesImport;
use App\Models\SupplierCategory;
use App\Services\ActivityLogger;
use App\Services\Suppliers\SupplierCategoryImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Maatwebsite\Excel\Facades\Excel;

final class SupplierCategoryController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
        private readonly SupplierCategoryImportService $importService,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('viewAny', SupplierCategory::class);

        $all = SupplierCategory::withCount(['suppliers'])
            ->orderBy('code')
            ->get();

        $byId = $all->keyBy('id');
        $fullPathEn = [];
        $fullPathAr = [];
        $childrenCount = [];
        foreach ($all as $c) {
            $pathEn = [];
            $pathAr = [];
            $cur = $c;
            while ($cur !== null) {
                array_unshift($pathEn, $cur->name_en);
                array_unshift($pathAr, $cur->name_ar);
                $cur = $cur->parent_id ? ($byId->get($cur->parent_id) ?? null) : null;
            }
            $fullPathEn[$c->id] = implode(' > ', $pathEn);
            $fullPathAr[$c->id] = implode(' > ', $pathAr);
            $childrenCount[$c->id] = $all->where('parent_id', $c->id)->count();
        }

        $flatList = $all->map(fn (SupplierCategory $c) => [
            'id' => $c->id,
            'parent_id' => $c->parent_id,
            'code' => $c->code,
            'name_en' => $c->name_en,
            'name_ar' => $c->name_ar,
            'level' => $c->level,
            'supplier_type' => $c->supplier_type,
            'is_active' => $c->is_active,
            'is_legacy' => (bool) ($c->is_legacy ?? false),
            'suppliers_count' => $c->suppliers_count,
            'children_count' => $childrenCount[$c->id] ?? 0,
            'full_path_en' => $fullPathEn[$c->id] ?? '',
            'full_path_ar' => $fullPathAr[$c->id] ?? '',
            'created_at' => $c->created_at?->toIso8601String(),
            'updated_at' => $c->updated_at?->toIso8601String(),
        ])->values()->all();

        $tree = $this->buildTree($all->whereNull('parent_id')->sortBy('code')->values(), $all, $fullPathEn, $fullPathAr, $childrenCount);

        return Inertia::render('Suppliers/Categories/Index', [
            'tree' => $tree,
            'flatList' => $flatList,
            'supplierTypes' => SupplierCategory::SUPPLIER_TYPES,
            'importResult' => $request->session()->get('import_result'),
            'importLevel' => $request->session()->get('import_level'),
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, SupplierCategory>  $roots
     * @param  \Illuminate\Support\Collection<int, SupplierCategory>  $all
     * @param  array<string, string>  $fullPathEn
     * @param  array<string, string>  $fullPathAr
     * @param  array<string, int>  $childrenCount
     * @return list<array<string, mixed>>
     */
    private function buildTree($roots, $all, array $fullPathEn, array $fullPathAr, array $childrenCount): array
    {
        $result = [];
        foreach ($roots as $c) {
            $children = $all->where('parent_id', $c->id)->sortBy('code')->values();
            $result[] = [
                'id' => $c->id,
                'parent_id' => $c->parent_id,
                'code' => $c->code,
                'name_en' => $c->name_en,
                'name_ar' => $c->name_ar,
                'level' => $c->level,
                'supplier_type' => $c->supplier_type,
                'is_active' => $c->is_active,
                'is_legacy' => (bool) ($c->is_legacy ?? false),
                'suppliers_count' => $c->suppliers_count,
                'children_count' => $childrenCount[$c->id] ?? 0,
                'full_path_en' => $fullPathEn[$c->id] ?? '',
                'full_path_ar' => $fullPathAr[$c->id] ?? '',
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
                'children' => $children->isEmpty() ? [] : $this->buildTree($children, $all, $fullPathEn, $fullPathAr, $childrenCount),
            ];
        }
        return $result;
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', SupplierCategory::class);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'uuid', 'exists:supplier_categories,id'],
            'code' => ['required', 'string', 'max:100', 'unique:supplier_categories,code'],
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['required', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', Rule::in(SupplierCategory::SUPPLIER_TYPES)],
            'is_active' => ['boolean'],
        ]);

        $parent = $validated['parent_id'] ? SupplierCategory::findOrFail($validated['parent_id']) : null;
        if ($parent !== null && $parent->level >= 3) {
            return redirect()->back()->withErrors(['parent_id' => __('supplier_categories.cannot_add_child_level3')]);
        }
        $level = $parent === null ? 1 : $parent->level + 1;

        $category = SupplierCategory::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'parent_id' => $validated['parent_id'],
            'code' => $validated['code'],
            'name_en' => $validated['name_en'],
            'name_ar' => $validated['name_ar'],
            'level' => $level,
            'supplier_type' => $validated['supplier_type'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->activityLogger->log('suppliers.category_created', $category, [], $category->toArray(), $request->user());

        return redirect()->back()->with('success', __('supplier_categories.category_created'));
    }

    public function update(Request $request, SupplierCategory $supplier_category): RedirectResponse
    {
        $this->authorize('update', $supplier_category);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'uuid', 'exists:supplier_categories,id'],
            'code' => ['required', 'string', 'max:100', Rule::unique('supplier_categories', 'code')->ignore($supplier_category->id)],
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['required', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', Rule::in(SupplierCategory::SUPPLIER_TYPES)],
            'is_active' => ['boolean'],
        ]);

        $newParentId = isset($validated['parent_id']) ? $validated['parent_id'] : $supplier_category->parent_id;
        if ($newParentId === $supplier_category->id) {
            return redirect()->back()->withErrors(['parent_id' => __('supplier_categories.invalid_parent_self')]);
        }
        if ($newParentId !== null) {
            $descendantIds = $supplier_category->descendants()->pluck('id')->push($supplier_category->id)->all();
            if (in_array($newParentId, $descendantIds, true)) {
                return redirect()->back()->withErrors(['parent_id' => __('supplier_categories.invalid_parent_descendant')]);
            }
            $newParent = SupplierCategory::find($newParentId);
            if ($newParent && $newParent->level >= 3) {
                return redirect()->back()->withErrors(['parent_id' => __('supplier_categories.cannot_add_child_level3')]);
            }
        }

        $parentLevel = $newParentId === null ? 0 : (SupplierCategory::where('id', $newParentId)->value('level') ?? 0);
        $level = $parentLevel + 1;
        if ($level > 3) {
            return redirect()->back()->withErrors(['parent_id' => __('supplier_categories.level_max_3')]);
        }

        $old = $supplier_category->toArray();
        $supplier_category->update([
            'parent_id' => $newParentId,
            'code' => $validated['code'],
            'name_en' => $validated['name_en'],
            'name_ar' => $validated['name_ar'],
            'level' => $level,
            'supplier_type' => $validated['supplier_type'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->activityLogger->log('suppliers.category_updated', $supplier_category->fresh(), $old, $supplier_category->toArray(), $request->user());

        if (isset($old['is_active']) && (bool) $old['is_active'] !== (bool) $validated['is_active']) {
            $this->activityLogger->log('suppliers.category_status_changed', $supplier_category->fresh(), $old, $supplier_category->toArray(), $request->user());
        }

        return redirect()->back()->with('success', __('supplier_categories.category_updated'));
    }

    public function destroy(Request $request, SupplierCategory $supplier_category): RedirectResponse
    {
        $this->authorize('delete', $supplier_category);

        if ($supplier_category->children()->count() > 0) {
            return redirect()->back()->withErrors(['category' => __('supplier_categories.delete_blocked_children')]);
        }
        if ($supplier_category->suppliers()->count() > 0) {
            return redirect()->back()->withErrors(['category' => __('supplier_categories.delete_blocked_suppliers')]);
        }
        try {
            if ($supplier_category->capabilities()->count() > 0) {
                return redirect()->back()->withErrors(['category' => __('supplier_categories.delete_blocked_capabilities')]);
            }
        } catch (\Throwable) {
            // If capabilities FK/type is mismatched (e.g. uuid vs bigint), skip capability check
        }

        $old = $supplier_category->toArray();
        $supplier_category->delete();
        $this->activityLogger->log('suppliers.category_deleted', $supplier_category, $old, [], $request->user());

        return redirect()->back()->with('success', __('supplier_categories.category_deleted'));
    }

    /**
     * Export the full supplier category tree as Excel.
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', SupplierCategory::class);
        $filename = 'supplier-categories-' . now()->format('Y-m-d-His') . '.xlsx';
        return Excel::download(new SupplierCategoriesExport, $filename);
    }

    /**
     * Download template for main categories (level 1).
     */
    public function templateMain(Request $request)
    {
        $this->authorize('viewAny', SupplierCategory::class);
        $filename = 'supplier-categories-template-main.xlsx';
        return Excel::download(new SupplierCategoryTemplateExport(1), $filename);
    }

    /**
     * Download template for sub-main categories (level 2).
     */
    public function templateSub(Request $request)
    {
        $this->authorize('viewAny', SupplierCategory::class);
        $filename = 'supplier-categories-template-sub.xlsx';
        return Excel::download(new SupplierCategoryTemplateExport(2), $filename);
    }

    /**
     * Download template for leaf categories (level 3).
     */
    public function templateLeaf(Request $request)
    {
        $this->authorize('viewAny', SupplierCategory::class);
        $filename = 'supplier-categories-template-leaf.xlsx';
        return Excel::download(new SupplierCategoryTemplateExport(3), $filename);
    }

    /**
     * Import main categories (level 1) from Excel.
     */
    public function importMain(Request $request): RedirectResponse
    {
        $this->authorize('create', SupplierCategory::class);
        $validated = $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240']]);
        $import = new SupplierCategoriesImport(1, $this->importService);
        Excel::import($import, $validated['file']);
        $result = $import->result ?? ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        return redirect()->back()->with('import_result', $result)->with('import_level', 1);
    }

    /**
     * Import sub-main categories (level 2) from Excel.
     */
    public function importSub(Request $request): RedirectResponse
    {
        $this->authorize('create', SupplierCategory::class);
        $validated = $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240']]);
        $import = new SupplierCategoriesImport(2, $this->importService);
        Excel::import($import, $validated['file']);
        $result = $import->result ?? ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        return redirect()->back()->with('import_result', $result)->with('import_level', 2);
    }

    /**
     * Import leaf categories (level 3) from Excel.
     */
    public function importLeaf(Request $request): RedirectResponse
    {
        $this->authorize('create', SupplierCategory::class);
        $validated = $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240']]);
        $import = new SupplierCategoriesImport(3, $this->importService);
        Excel::import($import, $validated['file']);
        $result = $import->result ?? ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        return redirect()->back()->with('import_result', $result)->with('import_level', 3);
    }
}
