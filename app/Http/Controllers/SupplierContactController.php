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
    private const IMAGE_MAX_KB = 2048;

    /** @return array<string, string> */
    private static function uploadValidationMessages(): array
    {
        return [
            'avatar.mimes' => __('supplier_portal.invalid_file_format'),
            'avatar.max' => __('supplier_portal.file_too_large'),
            'business_card_front.mimes' => __('supplier_portal.invalid_file_format'),
            'business_card_front.max' => __('supplier_portal.file_too_large'),
            'business_card_back.mimes' => __('supplier_portal.invalid_file_format'),
            'business_card_back.max' => __('supplier_portal.file_too_large'),
        ];
    }

    /** @return array<string, array<int, string>> */
    private static function contactValidationRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'is_primary' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'avatar' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_front' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_back' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
        ];
    }

    private function syncContactMedia(Request $request, SupplierContact $contact, bool $clearExisting = false): void
    {
        foreach (['avatar', 'business_card_front', 'business_card_back'] as $field) {
            if (! $request->hasFile($field)) {
                continue;
            }

            if ($clearExisting) {
                $contact->clearMediaCollection($field);
            }

            $contact->addMediaFromRequest($field)->toMediaCollection($field);
        }
    }

    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate(self::contactValidationRules(), self::uploadValidationMessages());

        $contact = DB::transaction(function () use ($supplier, $validated) {
            if (! empty($validated['is_primary'])) {
                SupplierContact::where('supplier_id', $supplier->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            return SupplierContact::create([
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

        $this->syncContactMedia($request, $contact);

        return redirect()->back()->with('success', 'Contact added.');
    }

    public function update(Request $request, Supplier $supplier, SupplierContact $contact): RedirectResponse
    {
        $this->authorize('update', $supplier);

        if ($contact->supplier_id !== $supplier->id) {
            abort(404);
        }

        $validated = $request->validate(self::contactValidationRules(), self::uploadValidationMessages());

        DB::transaction(function () use ($supplier, $contact, $validated) {
            if (! empty($validated['is_primary'])) {
                SupplierContact::where('supplier_id', $supplier->id)
                    ->where('id', '!=', $contact->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
            $contact->update([
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

        $this->syncContactMedia($request, $contact, true);

        return redirect()->back()->with('success', 'Contact updated.');
    }

    public function setPrimary(Request $request, Supplier $supplier, SupplierContact $contact): RedirectResponse
    {
        $this->authorize('update', $supplier);

        if ($contact->supplier_id !== $supplier->id) {
            abort(404);
        }

        DB::transaction(function () use ($supplier, $contact) {
            $supplier->contacts()->update(['is_primary' => false]);
            $contact->update(['is_primary' => true]);
        });

        return redirect()->back()->with('success', 'Primary contact updated.');
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
