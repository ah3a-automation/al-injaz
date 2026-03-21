<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\SupplierContact;
use App\Support\SupplierPhoneNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;


final class ContactProfileController extends Controller
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

    private function getEditableContact(Request $request): SupplierContact
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }
        $contact = $supplier->contacts()->with('media')->where('is_primary', true)->first()
            ?? $supplier->contacts()->with('media')->orderBy('created_at')->first();
        if (! $contact) {
            abort(404, __('supplier_portal.no_contact_for_profile'));
        }
        return $contact;
    }

    private function contactBelongsToCurrentUser(Request $request, SupplierContact $contact): bool
    {
        $supplier = $request->user()?->supplierProfile;
        return $supplier && $contact->supplier_id === $supplier->id;
    }

    public function edit(Request $request): InertiaResponse
    {
        $contact = $this->getEditableContact($request);

        $base = $contact->only(
            'id',
            'name',
            'job_title',
            'department',
            'contact_type',
            'email',
            'phone',
            'mobile',
            'avatar_path',
            'business_card_front_path',
            'business_card_back_path',
            'is_primary'
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

        return Inertia::render('SupplierPortal/ContactProfile/Edit', [
            'contact' => $base,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $contact = $this->getEditableContact($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:100'],
            'contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'is_primary' => ['nullable', 'boolean'],
            'avatar' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_front' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'business_card_back' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
        ], self::uploadValidationMessages());

        $updates = [
            'name' => $validated['name'],
            'job_title' => $validated['job_title'] ?? null,
            'department' => $validated['department'] ?? null,
            'contact_type' => $validated['contact_type'],
            'email' => $validated['email'] ?? null,
            'phone' => SupplierPhoneNormalizer::normalize($validated['phone'] ?? null),
            'mobile' => SupplierPhoneNormalizer::normalize($validated['mobile'] ?? null),
            'is_primary' => (bool) ($validated['is_primary'] ?? false),
        ];

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

        $contact->update($updates);

        return redirect()->route('supplier.contact.profile')->with('success', __('supplier_portal.contact_profile_updated_flash'));
    }

    public function showMedia(Request $request, SupplierContact $contact, string $type): Response
    {
        if (! $this->contactBelongsToCurrentUser($request, $contact)) {
            abort(403, __('supplier_portal.unauthorized'));
        }

        $collection = match ($type) {
            'avatar' => 'avatar',
            'business_card_front' => 'business_card_front',
            'business_card_back' => 'business_card_back',
            default => null,
        };

        if ($collection) {
            $media = $contact->getFirstMedia($collection);
            if ($media) {
                $path = $media->getPath();
                if ($path && file_exists($path)) {
                    $mime = $media->mime_type ?: 'application/octet-stream';
                    return response(file_get_contents($path), 200, [
                        'Content-Type' => $mime,
                        'Content-Disposition' => 'inline',
                    ]);
                }
            }
        }

        $pathColumn = match ($type) {
            'avatar' => 'avatar_path',
            'business_card_front' => 'business_card_front_path',
            'business_card_back' => 'business_card_back_path',
            default => null,
        };

        if (! $pathColumn || ! $contact->{$pathColumn}) {
            abort(404, __('supplier_portal.media_not_found'));
        }

        $path = $contact->{$pathColumn};
        $disk = config('filesystems.default');
        if (! Storage::disk($disk)->exists($path)) {
            abort(404, __('supplier_portal.file_not_found'));
        }

        $mime = Storage::disk($disk)->mimeType($path) ?: 'application/octet-stream';
        return response(Storage::disk($disk)->get($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline',
        ]);
    }
}
