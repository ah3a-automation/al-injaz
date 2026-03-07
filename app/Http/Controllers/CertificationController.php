<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Certification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

final class CertificationController extends Controller
{
    public function index(Request $request): Response
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $certifications = Certification::orderBy('sort_order')->paginate(50);

        return Inertia::render('Suppliers/Certifications/Index', [
            'certifications' => $certifications,
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
            'issuing_body' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'requires_expiry' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'certifications');
        Certification::create([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'slug' => $slug,
            'issuing_body' => $validated['issuing_body'] ?? null,
            'description' => $validated['description'] ?? null,
            'requires_expiry' => $validated['requires_expiry'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Certification created.');
    }

    public function update(Request $request, Certification $certification): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'issuing_body' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'requires_expiry' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueSlug($validated['name'], 'certifications', $certification->id);
        $certification->update([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'slug' => $slug,
            'issuing_body' => $validated['issuing_body'] ?? null,
            'description' => $validated['description'] ?? null,
            'requires_expiry' => $validated['requires_expiry'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', 'Certification updated.');
    }

    public function destroy(Request $request, Certification $certification): RedirectResponse
    {
        if (! $request->user()->can('suppliers.create')) {
            abort(403);
        }

        $certification->delete();

        return redirect()->back()->with('success', 'Certification deleted.');
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
