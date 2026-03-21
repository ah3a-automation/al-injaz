<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Models\SupplierCategory;
use App\Models\SupplierDocument;
use App\Rules\CityBelongsToCountry;
use App\Rules\SaudiCommercialRegistrationNumber;
use App\Rules\SaudiVatNumber;
use App\Services\GeocodingService;
use App\Services\ReverseGeocodingService;
use App\Support\SupplierCompletenessCalculator;
use App\Support\SupplierPhoneNormalizer;
use App\Support\TimelineBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class ProfileController extends Controller
{
    private const IMAGE_MAX_KB = 2048;

    public function __construct(
        private readonly GeocodingService $geocodingService,
        private readonly ReverseGeocodingService $reverseGeocodingService,
    ) {}

    public function edit(Request $request): InertiaResponse
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }
        $supplier->loadCount('contacts');
        $supplier->load([
            'categories:id,name_en,name_ar,code,level,parent_id,supplier_type,is_active',
            'contacts' => function ($q) {
                $q->with('media');
            },
            'documents.uploader.roles',
            'media',
            'certifications',
        ]);
        $contactsTotal = $supplier->contacts_count;
        $categories = SupplierCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name_en', 'name_ar', 'code', 'level', 'parent_id']);
        $locations = config('locations.countries', []);

        $supplierData = $supplier->toArray();
        $logoMedia = $supplier->getFirstMedia('company_logo');
        $supplierData['company_logo_url'] = $logoMedia
            ? $logoMedia->getUrl()
            : ($supplier->company_logo_path ? route('supplier.company.logo') : null);

        if (isset($supplierData['contacts']) && is_array($supplierData['contacts'])) {
            foreach ($supplier->contacts as $i => $contact) {
                $supplierData['contacts'][$i]['avatar_url'] = $contact->getFirstMedia('avatar')
                    ? $contact->getFirstMediaUrl('avatar')
                    : ($contact->avatar_path ? route('supplier.contact.media', [$contact->id, 'avatar']) : null);
                $supplierData['contacts'][$i]['business_card_front_url'] = $contact->getFirstMedia('business_card_front')
                    ? $contact->getFirstMediaUrl('business_card_front')
                    : ($contact->business_card_front_path ? route('supplier.contact.media', [$contact->id, 'business_card_front']) : null);
                $supplierData['contacts'][$i]['business_card_back_url'] = $contact->getFirstMedia('business_card_back')
                    ? $contact->getFirstMediaUrl('business_card_back')
                    : ($contact->business_card_back_path ? route('supplier.contact.media', [$contact->id, 'business_card_back']) : null);
            }
        }

        $supplierData['contacts_total'] = $contactsTotal;

        // Add preview URLs for persisted supplier documents so the UI can open
        // preview modals without navigating to document show/download routes.
        if (isset($supplierData['documents']) && is_array($supplierData['documents'])) {
            $host = rtrim($request->getSchemeAndHttpHost(), '/');
            foreach ($supplierData['documents'] as $i => $doc) {
                $supplierData['documents'][$i] = SupplierDocument::presentForSupplier(
                    $supplier,
                    $doc,
                    $host,
                );

                $filePath = $supplierData['documents'][$i]['file_path'] ?? null;

                if (config('app.debug') && is_string($filePath)) {
                    $exists = Storage::disk('public')->exists($filePath);
                    logger()->debug('supplier_portal_preview_url', [
                        'supplier_id' => $supplier->id,
                        'file_path' => $filePath,
                        'preview_url' => $supplierData['documents'][$i]['preview_url'],
                        'file_exists' => $exists,
                    ]);
                }
            }
        }

        $analytics = Cache::remember(
            'supplier_analytics_' . $supplier->id,
            now()->addMinutes(5),
            function () use ($supplier) {
                $rfqInvited = RfqSupplier::where('supplier_id', $supplier->id)->where('status', '!=', 'removed')->count();
                $quotesSubmitted = RfqQuote::where('supplier_id', $supplier->id)->where('status', 'submitted')->count();
                $awardsCount = RfqAward::where('supplier_id', $supplier->id)->count();
                $declinedCount = RfqSupplier::where('supplier_id', $supplier->id)->where('status', 'declined')->count();

                $responseRate = $rfqInvited > 0
                    ? round(($quotesSubmitted / $rfqInvited) * 100, 1)
                    : null;
                $awardRate = $quotesSubmitted > 0
                    ? round(($awardsCount / $quotesSubmitted) * 100, 1)
                    : null;

                if ($responseRate !== null && ! is_finite($responseRate)) {
                    $responseRate = null;
                }
                if ($awardRate !== null && ! is_finite($awardRate)) {
                    $awardRate = null;
                }

                return [
                    'rfq_invited_count' => $rfqInvited,
                    'quotes_submitted_count' => $quotesSubmitted,
                    'awards_count' => $awardsCount,
                    'declined_count' => $declinedCount,
                    'response_rate' => $responseRate,
                    'award_rate' => $awardRate,
                ];
            }
        );

        $supplierData['rfq_invited_count'] = $analytics['rfq_invited_count'];
        $supplierData['quotes_submitted_count'] = $analytics['quotes_submitted_count'];
        $supplierData['awards_count'] = $analytics['awards_count'];
        $supplierData['declined_count'] = $analytics['declined_count'];
        $supplierData['response_rate'] = $analytics['response_rate'];
        $supplierData['award_rate'] = $analytics['award_rate'];
        $supplierData['activity_items'] = [];
        $supplierData['on_time_delivery_rate'] = null;
        $supplierData['quality_score'] = null;

        $responseRate = $supplierData['response_rate'];
        $awardRate = $supplierData['award_rate'];
        $supplierData['supplier_score'] = ($responseRate !== null && $awardRate !== null)
            ? (int) round(($responseRate + $awardRate) / 2)
            : null;

        $completeness = SupplierCompletenessCalculator::calculate($supplier);

        return Inertia::render('SupplierPortal/Profile/Edit', [
            'supplier' => $supplierData,
            'categories' => $categories,
            'locations' => $locations,
            'completeness' => $completeness,
            'timeline' => $this->supplierSafeTimeline($supplier),
        ]);
    }

    public function editFull(Request $request): InertiaResponse
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        $supplier->load([
            'categories:id,name_en,name_ar,code',
            'documents.uploader.roles',
            'media',
            'contacts' => function ($q) {
                $q->with('media')->latest()->take(50);
            },
        ]);

        $supplierData = $supplier->toArray();

        $logoMedia = $supplier->getFirstMedia('company_logo');
        $supplierData['company_logo_url'] = $logoMedia
            ? $logoMedia->getUrl()
            : ($supplier->company_logo_path ? route('supplier.company.logo') : null);

        if (isset($supplierData['contacts']) && is_array($supplierData['contacts'])) {
            foreach ($supplier->contacts as $i => $contact) {
                $supplierData['contacts'][$i]['avatar_url'] = $contact->getFirstMedia('avatar')
                    ? $contact->getFirstMediaUrl('avatar')
                    : ($contact->avatar_path ? route('supplier.contact.media', [$contact->id, 'avatar']) : null);
                $supplierData['contacts'][$i]['business_card_front_url'] = $contact->getFirstMedia('business_card_front')
                    ? $contact->getFirstMediaUrl('business_card_front')
                    : ($contact->business_card_front_path ? route('supplier.contact.media', [$contact->id, 'business_card_front']) : null);
                $supplierData['contacts'][$i]['business_card_back_url'] = $contact->getFirstMedia('business_card_back')
                    ? $contact->getFirstMediaUrl('business_card_back')
                    : ($contact->business_card_back_path ? route('supplier.contact.media', [$contact->id, 'business_card_back']) : null);
            }
        }

        $host = rtrim($request->getSchemeAndHttpHost(), '/');

        if (isset($supplierData['documents']) && is_array($supplierData['documents'])) {
            foreach ($supplierData['documents'] as $i => $doc) {
                $supplierData['documents'][$i] = SupplierDocument::presentForSupplier(
                    $supplier,
                    $doc,
                    $host,
                );
            }
        }

        // Latest/current documents by type for completeness & UI
        $documentsByType = $supplier->documents
            ->where('is_current', true)
            ->keyBy('document_type');

        $supplierData['document_summary'] = [
            'cr' => $documentsByType->get(SupplierDocument::TYPE_CR)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
            'vat' => $documentsByType->get(SupplierDocument::TYPE_VAT)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
            'unified' => $documentsByType->get(SupplierDocument::TYPE_UNIFIED)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
            'national_address' => $documentsByType->get(SupplierDocument::TYPE_NATIONAL_ADDRESS)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
            'bank_certificate' => $documentsByType->get(SupplierDocument::TYPE_BANK_LETTER)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
            'credit_application' => $documentsByType->get(SupplierDocument::TYPE_CREDIT_APPLICATION)?->only(['id', 'file_name', 'document_type', 'version', 'mime_type', 'file_path']),
        ];

        foreach (['cr', 'vat', 'unified', 'national_address', 'bank_certificate', 'credit_application'] as $key) {
            $item = $supplierData['document_summary'][$key] ?? null;
            if (! is_array($item)) {
                continue;
            }

            $supplierData['document_summary'][$key] = SupplierDocument::presentForSupplier(
                $supplier,
                $item,
                $host,
            );

            $filePath = $supplierData['document_summary'][$key]['file_path'] ?? null;

            if (config('app.debug') && is_string($filePath)) {
                $exists = Storage::disk('public')->exists($filePath);
                logger()->debug('supplier_portal_editfull_preview_url', [
                    'supplier_id' => $supplier->id,
                    'document_key' => $key,
                    'file_path' => $filePath,
                    'preview_url' => $supplierData['document_summary'][$key]['preview_url'],
                    'file_exists' => $exists,
                ]);
            }
        }

        $categories = SupplierCategory::selectable()
            ->orderBy('code')
            ->get(['id', 'code', 'name_en', 'name_ar', 'supplier_type', 'parent_id', 'level'])
            ->map(fn (SupplierCategory $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'name_en' => $c->name_en,
                'name_ar' => $c->name_ar,
                'supplier_type' => $c->supplier_type,
                'parent_id' => $c->parent_id,
                'level' => $c->level,
            ]);

        return Inertia::render('SupplierPortal/Profile/EditFull', [
            'supplier' => $supplierData,
            'locations' => config('locations.countries', []),
            'categories' => $categories,
            'documentExpiryLinks' => SupplierDocument::linkedExpiryFieldMap(),
            'supplierTypeCategoryMap' => [
                'supplier' => SupplierCategory::categoryTypesForSupplierType('supplier'),
                'subcontractor' => SupplierCategory::categoryTypesForSupplierType('subcontractor'),
                'service_provider' => SupplierCategory::categoryTypesForSupplierType('service_provider'),
                'consultant' => SupplierCategory::categoryTypesForSupplierType('consultant'),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }

        $validated = $request->validate([
            'legal_name_en' => ['required', 'string', 'max:255'],
            'legal_name_ar' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', 'in:supplier,subcontractor,service_provider,consultant'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100', new CityBelongsToCountry],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:255'],
            'commercial_registration_no' => ['nullable', 'string', 'max:100', new SaudiCommercialRegistrationNumber()],
            'cr_expiry_date' => ['nullable', 'date', 'after:today'],
            'vat_number' => ['nullable', 'string', 'max:100', new SaudiVatNumber()],
            'unified_number' => ['nullable', 'string', 'max:100'],
            'business_license_number' => ['nullable', 'string', 'max:100'],
            'license_expiry_date' => ['nullable', 'date', 'after:today'],
            'insurance_expiry_date' => ['nullable', 'date', 'after:today'],
            'vat_expiry_date' => ['nullable', 'date', 'after:today'],
            'chamber_of_commerce_number' => ['nullable', 'string', 'max:100'],
            'classification_grade' => ['nullable', 'string', 'max:100'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_country' => ['nullable', 'string', 'max:100'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:50'],
            'swift_code' => ['nullable', 'string', 'max:20'],
            'preferred_currency' => ['nullable', 'string', 'max:10', 'in:SAR,USD,EUR,AED,GBP'],
            'payment_terms_days' => ['nullable', 'integer', 'in:30,60,90,120'],
            'tax_withholding_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'workforce_size' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['string', 'uuid', 'exists:supplier_categories,id'],
            'company_logo' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:' . self::IMAGE_MAX_KB],
            'cr_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'vat_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'unified_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'national_address_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'bank_certificate' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'credit_application' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'coordinates_locked' => ['nullable', 'boolean'],
        ], [
            'company_logo.mimes' => __('supplier_portal.invalid_file_format'),
            'company_logo.max' => __('supplier_portal.file_too_large'),
        ]);

        $data = collect($validated)->except([
            'category_ids',
            'company_logo',
            'cr_document',
            'vat_document',
            'unified_document',
            'national_address_document',
            'bank_certificate',
            'credit_application',
        ])->map(function ($v) {
            if ($v === '') {
                return null;
            }
            return $v;
        })->all();
        $data['phone'] = SupplierPhoneNormalizer::normalize($validated['phone'] ?? null);
        $supplier->update($data);

        $addressChanged = $supplier->wasChanged(['address', 'city', 'country']);

        if (! $supplier->coordinates_locked && $addressChanged) {
            $supplier->latitude = null;
            $supplier->longitude = null;
            $supplier->save();
        }

        if (
            ! $supplier->coordinates_locked
            && (
                $addressChanged
                || $supplier->latitude === null
                || $supplier->longitude === null
            )
        ) {
            $addressString = implode(', ', array_filter([
                $supplier->address,
                $supplier->city,
                $supplier->country,
            ]));
            if ($addressString !== '') {
                sleep(1);
                $coords = $this->geocodingService->geocode($addressString);
                if ($coords) {
                    $supplier->latitude = $coords['latitude'];
                    $supplier->longitude = $coords['longitude'];
                    $supplier->save();
                }
            }
        }

        if (array_key_exists('category_ids', $validated)) {
            $categoryIds = $validated['category_ids'] ?? [];
            if ($categoryIds !== []) {
                $allowedTypes = SupplierCategory::categoryTypesForSupplierType($validated['supplier_type']);
                $invalid = SupplierCategory::whereIn('id', $categoryIds)
                    ->where(function ($q) use ($allowedTypes) {
                        $q->whereNotIn('supplier_type', $allowedTypes)
                            ->orWhere('is_active', false)
                            ->orWhere('is_legacy', true);
                    })
                    ->exists();
                if ($invalid) {
                    return redirect()->back()->withErrors(['category_ids' => __('supplier_categories.categories_must_match_supplier_type')])->withInput();
                }
            }
            $supplier->categories()->sync($categoryIds);
        }

        if ($request->hasFile('company_logo')) {
            $supplier->clearMediaCollection('company_logo');
            $supplier->addMediaFromRequest('company_logo')->toMediaCollection('company_logo');
        }

        // Controlled replace of key supplier documents
        $uploadedBy = $request->user()->id ?? null;

        $handleDocumentUpload = function (string $input, string $type) use ($request, $supplier, $uploadedBy): void {
            if (! $request->hasFile($input)) {
                return;
            }

            SupplierDocument::createVersionedUpload(
                $supplier,
                $request->file($input),
                $type,
                $uploadedBy,
            );
        };

        $handleDocumentUpload('cr_document', SupplierDocument::TYPE_CR);
        $handleDocumentUpload('vat_document', SupplierDocument::TYPE_VAT);
        $handleDocumentUpload('unified_document', SupplierDocument::TYPE_UNIFIED);
        $handleDocumentUpload('national_address_document', SupplierDocument::TYPE_NATIONAL_ADDRESS);
        $handleDocumentUpload('bank_certificate', SupplierDocument::TYPE_BANK_LETTER);
        $handleDocumentUpload('credit_application', SupplierDocument::TYPE_CREDIT_APPLICATION);

        return redirect()->route('supplier.profile')->with('success', __('supplier_portal.profile_updated_flash'));
    }

    public function geocodeAddress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['required', 'string', 'max:500'],
        ]);

        $coords = $this->geocodingService->geocode($validated['address']);

        if ($coords === null) {
            return response()->json(['message' => __('supplier_portal.geocode_failed')], 422);
        }

        return response()->json([
            'latitude' => $coords['latitude'],
            'longitude' => $coords['longitude'],
        ]);
    }

    public function reverseGeocode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $result = $this->reverseGeocodingService->reverse(
            (float) $validated['lat'],
            (float) $validated['lng']
        );

        if ($result === null) {
            return response()->json(['address' => null, 'city' => null, 'country' => null], 200);
        }

        return response()->json($result);
    }

    public function showLogo(Request $request): Response
    {
        $supplier = $request->user()?->supplierProfile;
        if (! $supplier) {
            abort(404, __('supplier_portal.logo_not_found'));
        }

        $media = $supplier->getFirstMedia('company_logo');
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

        if ($supplier->company_logo_path) {
            $disk = config('filesystems.default');
            if (Storage::disk($disk)->exists($supplier->company_logo_path)) {
                $mime = Storage::disk($disk)->mimeType($supplier->company_logo_path) ?: 'application/octet-stream';
                return response(Storage::disk($disk)->get($supplier->company_logo_path), 200, [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline',
                ]);
            }
        }

        abort(404, __('supplier_portal.logo_not_found'));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function supplierSafeTimeline(Supplier $supplier): array
    {
        $allowedEvents = [
            'suppliers.supplier.created',
            'suppliers.supplier.updated',
            'suppliers.supplier.status_changed',
        ];

        return collect(TimelineBuilder::forSubject(Supplier::class, (string) $supplier->id))
            ->filter(
                static fn (array $event): bool => in_array(
                    (string) ($event['event'] ?? ''),
                    $allowedEvents,
                    true,
                )
            )
            ->map(static function (array $event): array {
                return [
                    'id' => $event['id'] ?? '',
                    'event' => (string) ($event['event'] ?? ''),
                    'title' => (string) ($event['title'] ?? ''),
                    'actor' => null,
                    'timestamp' => (string) ($event['timestamp'] ?? ''),
                    'context' => is_array($event['context'] ?? null) ? $event['context'] : [],
                ];
            })
            ->values()
            ->all();
    }
}
