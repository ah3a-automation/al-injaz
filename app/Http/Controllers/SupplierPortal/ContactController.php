<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\SupplierContact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ContactController extends Controller
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

    private function getSupplier(Request $request)
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, 'Supplier profile not found.');
        }
        return $supplier;
    }

    private function authorizeContact(Request $request, SupplierContact $contact): void
    {
        $supplier = $this->getSupplier($request);
        if ($contact->supplier_id !== $supplier->id) {
            abort(403, 'Unauthorized.');
        }
    }

    public function create(Request $request): InertiaResponse
    {
        $this->getSupplier($request);

        return Inertia::render('SupplierPortal/Contacts/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $supplier = $this->getSupplier($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'avatar' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_front' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_back' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
        ], self::uploadValidationMessages());

        $contact = new SupplierContact();
        $contact->id = (string) Str::uuid();
        $contact->supplier_id = $supplier->id;
        $contact->name = $validated['name'];
        $contact->job_title = $validated['job_title'] ?? null;
        $contact->department = $validated['department'] ?? null;
        $contact->contact_type = $validated['contact_type'];
        $contact->email = $validated['email'] ?? null;
        $contact->phone = $validated['phone'] ?? null;
        $contact->mobile = $validated['mobile'] ?? null;
        $contact->is_primary = $supplier->contacts()->count() === 0;
        $contact->save();

        if ($request->hasFile('avatar')) {
            $contact->addMediaFromRequest('avatar')->toMediaCollection('avatar');
        }
        if ($request->hasFile('business_card_front')) {
            $contact->addMediaFromRequest('business_card_front')->toMediaCollection('business_card_front');
        }
        if ($request->hasFile('business_card_back')) {
            $contact->addMediaFromRequest('business_card_back')->toMediaCollection('business_card_back');
        }

        return redirect()->route('supplier.profile')->with(['success' => 'Contact added successfully.', 'scroll_to' => 'contacts']);
    }

    public function edit(Request $request, SupplierContact $contact): InertiaResponse
    {
        $this->authorizeContact($request, $contact);
        $supplier = $this->getSupplier($request);

        $contact->load('media');
        $base = $contact->only(
            'id', 'name', 'job_title', 'department', 'contact_type',
            'email', 'phone', 'mobile', 'is_primary'
        );
        $base['avatar_url'] = $contact->getFirstMedia('avatar')
            ? $contact->getFirstMediaUrl('avatar')
            : ($contact->avatar_path ? route('supplier.contact.media', [$contact->id, 'avatar']) : null);
        $base['business_card_front_url'] = $contact->getFirstMedia('business_card_front')
            ? $contact->getFirstMediaUrl('business_card_front')
            : ($contact->business_card_front_path ? route('supplier.contact.media', [$contact->id, 'business_card_front']) : null);
        $base['business_card_back_url'] = $contact->getFirstMedia('business_card_back')
            ? $contact->getFirstMediaUrl('business_card_back')
            : ($contact->business_card_back_path ? route('supplier.contact.media', [$contact->id, 'business_card_back']) : null);

        return Inertia::render('SupplierPortal/Contacts/Edit', [
            'contact' => $base,
        ]);
    }

    public function update(Request $request, SupplierContact $contact): RedirectResponse
    {
        $this->authorizeContact($request, $contact);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'avatar' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_front' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_back' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
        ], self::uploadValidationMessages());

        $contact->update([
            'name' => $validated['name'],
            'job_title' => $validated['job_title'] ?? null,
            'department' => $validated['department'] ?? null,
            'contact_type' => $validated['contact_type'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'mobile' => $validated['mobile'] ?? null,
        ]);

        if ($request->hasFile('avatar')) {
            $contact->clearMediaCollection('avatar');
            $contact->addMediaFromRequest('avatar')->toMediaCollection('avatar');
        }
        if ($request->hasFile('business_card_front')) {
            $contact->clearMediaCollection('business_card_front');
            $contact->addMediaFromRequest('business_card_front')->toMediaCollection('business_card_front');
        }
        if ($request->hasFile('business_card_back')) {
            $contact->clearMediaCollection('business_card_back');
            $contact->addMediaFromRequest('business_card_back')->toMediaCollection('business_card_back');
        }

        return redirect()->route('supplier.profile')->with(['success' => 'Contact updated successfully.', 'scroll_to' => 'contacts']);
    }

    public function setPrimary(Request $request, SupplierContact $contact): RedirectResponse
    {
        $this->authorizeContact($request, $contact);
        $supplier = $this->getSupplier($request);

        DB::transaction(function () use ($supplier, $contact) {
            $supplier->contacts()->update(['is_primary' => false]);
            $contact->update(['is_primary' => true]);
        });

        return redirect()->back()->with('success', 'Primary contact updated.');
    }
}
