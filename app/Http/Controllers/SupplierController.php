<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Suppliers\Commands\CreateSupplierCommand;
use App\Application\Suppliers\Commands\DeleteSupplierCommand;
use App\Application\Suppliers\Commands\UpdateSupplierCommand;
use App\Application\Suppliers\Queries\GetSupplierQuery;
use App\Application\Suppliers\Queries\ListSuppliersQuery;
use App\Models\Certification;
use App\Models\Supplier;
use App\Models\SupplierCategory;
use App\Models\SupplierContact;
use App\Models\SupplierDocument;
use App\Rules\SaudiCommercialRegistrationNumber;
use App\Rules\SaudiVatNumber;
use App\Services\ActivityLogger;
use App\Support\SupplierPhoneNormalizer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\TimelineBuilder;

final class SupplierController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    private function contactMediaUrl(
        SupplierContact $contact,
        string $collection,
        ?string $legacyPath,
        string $host,
    ): ?string {
        if ($contact->getFirstMedia($collection)) {
            return $contact->getFirstMediaUrl($collection);
        }

        if (! is_string($legacyPath) || trim($legacyPath) === '') {
            return null;
        }

        return $host . '/storage/' . ltrim($legacyPath, '/');
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Supplier::class);

        $query = new ListSuppliersQuery(
            q: $request->input('q'),
            status: $request->input('status'),
            supplierType: $request->input('supplier_type'),
            country: $request->input('country'),
            categoryId: $request->input('category_id') ? (string) $request->input('category_id') : null,
            sortField: (string) $request->input('sort_field', 'created_at'),
            sortDir: (string) $request->input('sort_dir', 'desc'),
            perPage: (int) $request->input('per_page', 25),
            page: (int) $request->input('page', 1),
        );
        $suppliers = $query->handle();

        $categories = SupplierCategory::selectable()->orderBy('code')->get(['id', 'code', 'name_en', 'name_ar']);
        $countries = Supplier::query()->distinct()->orderBy('country')->pluck('country')->filter()->values();

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => [
                'q' => $request->input('q'),
                'status' => $request->input('status'),
                'supplier_type' => $request->input('supplier_type'),
                'country' => $request->input('country'),
                'category_id' => $request->input('category_id'),
                'sort_field' => $request->input('sort_field', 'created_at'),
                'sort_dir' => $request->input('sort_dir', 'desc'),
                'page' => $request->input('page', 1),
                'per_page' => $request->input('per_page', 25),
            ],
            'categories' => $categories,
            'countries' => $countries,
            'can' => [
                'create' => $request->user()->can('suppliers.create'),
                'update' => $request->user()->can('suppliers.edit'),
                'delete' => $request->user()->can('suppliers.delete'),
                'approve' => $request->user()->can('suppliers.approve'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Supplier::class);

        $categories = SupplierCategory::selectable()
            ->orderBy('code')
            ->get(['id', 'code', 'name_en', 'name_ar', 'supplier_type', 'parent_id'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'name_en' => $c->name_en,
                'name_ar' => $c->name_ar,
                'supplier_type' => $c->supplier_type,
                'parent_id' => $c->parent_id,
            ]);

        return Inertia::render('Suppliers/Create', [
            'categories' => $categories,
            'supplierTypeCategoryMap' => [
                'supplier' => SupplierCategory::categoryTypesForSupplierType('supplier'),
                'subcontractor' => SupplierCategory::categoryTypesForSupplierType('subcontractor'),
                'service_provider' => SupplierCategory::categoryTypesForSupplierType('service_provider'),
                'consultant' => SupplierCategory::categoryTypesForSupplierType('consultant'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Supplier::class);

        $validated = $request->validate([
            'legal_name_en' => ['required', 'string', 'max:255'],
            'legal_name_ar' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', 'in:supplier,subcontractor,service_provider,consultant'],
            'country' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255', 'unique:suppliers,email'],
            'website' => ['nullable', 'url', 'max:255'],
            'notes' => ['nullable', 'string'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['uuid', 'exists:supplier_categories,id'],
        ]);

        $allowedCategoryTypes = SupplierCategory::categoryTypesForSupplierType($validated['supplier_type']);
        $categoryIds = $validated['category_ids'] ?? [];
        if ($categoryIds !== []) {
            $invalid = SupplierCategory::whereIn('id', $categoryIds)
                ->where(function ($q) use ($allowedCategoryTypes) {
                    $q->whereNotIn('supplier_type', $allowedCategoryTypes)
                        ->orWhere('is_active', false)
                        ->orWhere('is_legacy', true);
                })
                ->pluck('id')
                ->all();
            if ($invalid !== []) {
                return redirect()->back()->withErrors(['category_ids' => __('supplier_categories.categories_must_match_supplier_type')])->withInput();
            }
        }

        $command = new CreateSupplierCommand(
            legalNameEn: $validated['legal_name_en'],
            country: $validated['country'],
            city: $validated['city'],
            supplierType: $validated['supplier_type'],
            legalNameAr: $validated['legal_name_ar'] ?? null,
            tradeName: $validated['trade_name'] ?? null,
            phone: SupplierPhoneNormalizer::normalize($validated['phone'] ?? null),
            email: $validated['email'] ?? null,
            website: $validated['website'] ?? null,
            postalCode: $validated['postal_code'] ?? null,
            address: $validated['address'] ?? null,
            notes: $validated['notes'] ?? null,
            createdByUserId: $request->user()->id,
            categoryIds: $validated['category_ids'] ?? [],
        );
        $supplier = $command->handle();

        $this->activityLogger->log('suppliers.supplier.created', $supplier, [], $supplier->toArray(), $request->user());

        return redirect()->route('suppliers.show', $supplier)->with('success', __('suppliers.created'));
    }

    public function show(Request $request, Supplier $supplier): Response
    {
        $this->authorize('view', $supplier);

        $getQuery = new GetSupplierQuery($supplier->id);
        $supplier = $getQuery->handle();
        $host = rtrim($request->getSchemeAndHttpHost(), '/');

        $supplier->contacts->each(function (SupplierContact $contact) use ($host): void {
            $contact->setAttribute(
                'avatar_url',
                $this->contactMediaUrl($contact, 'avatar', $contact->avatar_path ?? null, $host),
            );
            $contact->setAttribute(
                'business_card_front_url',
                $this->contactMediaUrl(
                    $contact,
                    'business_card_front',
                    $contact->business_card_front_path ?? null,
                    $host,
                ),
            );
            $contact->setAttribute(
                'business_card_back_url',
                $this->contactMediaUrl(
                    $contact,
                    'business_card_back',
                    $contact->business_card_back_path ?? null,
                    $host,
                ),
            );
        });

        $supplier->documents->each(function (SupplierDocument $document) use ($supplier, $host): void {
            $presented = SupplierDocument::presentForSupplier($supplier, $document->toArray(), $host);

            foreach (['preview_url', 'download_url', 'expiry_date', 'remaining_days', 'expiry_status', 'is_mandatory', 'source'] as $key) {
                $document->setAttribute($key, $presented[$key] ?? null);
            }
        });

        $logoMedia = $supplier->getFirstMedia('company_logo');
        // Used by the Supplier 360 identity rail to show the real uploaded logo.
        $supplier->setAttribute('company_logo_url', $logoMedia?->getUrl());

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
            'canApprove' => $request->user()->can('suppliers.approve'),
            'can' => [
                'update' => $request->user()->can('suppliers.edit'),
                'delete' => $request->user()->can('suppliers.delete'),
            ],
            'timeline' => TimelineBuilder::forSubject(Supplier::class, (string) $supplier->id),
        ]);
    }

    public function edit(Request $request, Supplier $supplier): Response
    {
        $this->authorize('update', $supplier);

        // Capabilities + service zones are intentionally removed from the admin edit experience.
        // Keep only what the shared edit flow still needs (categories, contacts, documents).
        $supplier->load(['categories', 'contacts.media', 'documents.uploader.roles']);
        $allowedTypes = SupplierCategory::categoryTypesForSupplierType($supplier->supplier_type);
        $categories = SupplierCategory::selectable()
            ->whereIn('supplier_type', $allowedTypes)
            ->orderBy('code')
            ->get(['id', 'code', 'name_en', 'name_ar', 'supplier_type', 'parent_id'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'name_en' => $c->name_en,
                'name_ar' => $c->name_ar,
                'supplier_type' => $c->supplier_type,
                'parent_id' => $c->parent_id,
            ]);
        $locations = config('locations.countries', []);

        // Build provider-friendly payload (logos/docs/contacts URLs) like supplier portal.
        $supplierData = $supplier->toArray();

        $logoMedia = $supplier->getFirstMedia('company_logo');
        $supplierData['company_logo_url'] = $logoMedia
            ? $logoMedia->getUrl()
            : null;

        $host = rtrim($request->getSchemeAndHttpHost(), '/');

        if (isset($supplierData['contacts']) && is_array($supplierData['contacts'])) {
            foreach ($supplier->contacts as $i => $contact) {
                $supplierData['contacts'][$i]['avatar_url'] = $this->contactMediaUrl(
                    $contact,
                    'avatar',
                    $contact->avatar_path ?? null,
                    $host,
                );
                $supplierData['contacts'][$i]['business_card_front_url'] = $this->contactMediaUrl(
                    $contact,
                    'business_card_front',
                    $contact->business_card_front_path ?? null,
                    $host,
                );
                $supplierData['contacts'][$i]['business_card_back_url'] = $this->contactMediaUrl(
                    $contact,
                    'business_card_back',
                    $contact->business_card_back_path ?? null,
                    $host,
                );
            }
        }

        if (isset($supplierData['documents']) && is_array($supplierData['documents'])) {
            foreach ($supplierData['documents'] as $i => $document) {
                $supplierData['documents'][$i] = SupplierDocument::presentForSupplier(
                    $supplier,
                    $document,
                    $host,
                );
            }
        }

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

        // Provide a direct preview URL for PDFs so the admin Documents tab can render a real thumbnail.
        // This is intentionally URL-based (not Ziggy route calls) to avoid Ziggy/middleware mismatches.
        foreach (['cr', 'vat', 'unified', 'national_address', 'bank_certificate', 'credit_application'] as $key) {
            if (! isset($supplierData['document_summary'][$key]) || $supplierData['document_summary'][$key] === null) {
                continue;
            }

            $supplierData['document_summary'][$key] = SupplierDocument::presentForSupplier(
                $supplier,
                $supplierData['document_summary'][$key],
                $host,
            );

            $filePath = $supplierData['document_summary'][$key]['file_path'] ?? null;

            if (config('app.debug') && is_string($filePath)) {
                $exists = Storage::disk('public')->exists($filePath);
                logger()->debug('admin_supplier_edit_preview_url', [
                    'supplier_id' => $supplier->id,
                    'document_key' => $key,
                    'file_path' => $filePath,
                    'preview_url' => $supplierData['document_summary'][$key]['preview_url'],
                    'file_exists' => $exists,
                ]);
            }
        }

        $supplierTypeCategoryMap = [
            'supplier' => SupplierCategory::categoryTypesForSupplierType('supplier'),
            'subcontractor' => SupplierCategory::categoryTypesForSupplierType('subcontractor'),
            'service_provider' => SupplierCategory::categoryTypesForSupplierType('service_provider'),
            'consultant' => SupplierCategory::categoryTypesForSupplierType('consultant'),
        ];

        return Inertia::render('Suppliers/Edit', [
            'supplier' => $supplierData,
            'categories' => $categories,
            'locations' => $locations,
            'supplierTypeCategoryMap' => $supplierTypeCategoryMap,
            'documentExpiryLinks' => SupplierDocument::linkedExpiryFieldMap(),
        ]);
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'legal_name_en' => ['required', 'string', 'max:255'],
            'legal_name_ar' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', 'in:supplier,subcontractor,service_provider,consultant'],
            'country' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('suppliers', 'email')->ignore($supplier->id)],
            'website' => ['nullable', 'url', 'max:255'],
            'notes' => ['nullable', 'string'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['uuid', 'exists:supplier_categories,id'],
        ]);
        $allowedCategoryTypes = SupplierCategory::categoryTypesForSupplierType($validated['supplier_type']);
        $categoryIds = isset($validated['category_ids']) ? array_values(array_map('strval', $validated['category_ids'])) : [];
        if ($categoryIds !== []) {
            $invalid = SupplierCategory::whereIn('id', $categoryIds)
                ->where(function ($q) use ($allowedCategoryTypes) {
                    $q->whereNotIn('supplier_type', $allowedCategoryTypes)
                        ->orWhere('is_active', false)
                        ->orWhere('is_legacy', true);
                })
                ->pluck('id')
                ->all();
            if ($invalid !== []) {
                return redirect()->back()->withErrors(['category_ids' => __('supplier_categories.categories_must_match_supplier_type')])->withInput();
            }
        }

        $validated = array_merge($validated, $request->validate([
            'commercial_registration_no' => ['nullable', 'string', 'max:100', Rule::unique('suppliers', 'commercial_registration_no')->ignore($supplier->id), new SaudiCommercialRegistrationNumber()],
            'cr_expiry_date' => ['nullable', 'date'],
            'vat_number' => ['nullable', 'string', 'max:100', new SaudiVatNumber()],
            'vat_expiry_date' => ['nullable', 'date'],
            'unified_number' => ['nullable', 'string', 'max:100'],
            'business_license_number' => ['nullable', 'string', 'max:100'],
            'license_expiry_date' => ['nullable', 'date'],
            'chamber_of_commerce_number' => ['nullable', 'string', 'max:100'],
            'classification_grade' => ['nullable', 'string', 'max:50'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_country' => ['nullable', 'string', 'max:100'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:50'],
            'swift_code' => ['nullable', 'string', 'max:20'],
            'preferred_currency' => ['nullable', 'string', 'max:10'],
            'payment_terms_days' => ['nullable', 'integer', 'in:30,60,90,120'],
            'tax_withholding_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            // Media uploads (match supplier portal edit full UI)
            'company_logo' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'cr_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'vat_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'unified_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'national_address_document' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'bank_certificate' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
            'credit_application' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp', 'max:5120'],
        ]));

        $data = array_filter([
            'legal_name_en' => $validated['legal_name_en'],
            'legal_name_ar' => $validated['legal_name_ar'] ?? null,
            'trade_name' => $validated['trade_name'] ?? null,
            'supplier_type' => $validated['supplier_type'],
            'country' => $validated['country'],
            'city' => $validated['city'],
            'postal_code' => $validated['postal_code'] ?? null,
            'address' => $validated['address'] ?? null,
            'phone' => SupplierPhoneNormalizer::normalize($validated['phone'] ?? null),
            'email' => $validated['email'] ?? null,
            'website' => $validated['website'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'commercial_registration_no' => $validated['commercial_registration_no'] ?? null,
            'cr_expiry_date' => $validated['cr_expiry_date'] ?? null,
            'vat_number' => $validated['vat_number'] ?? null,
            'vat_expiry_date' => $validated['vat_expiry_date'] ?? null,
            'unified_number' => $validated['unified_number'] ?? null,
            'business_license_number' => $validated['business_license_number'] ?? null,
            'license_expiry_date' => $validated['license_expiry_date'] ?? null,
            'chamber_of_commerce_number' => $validated['chamber_of_commerce_number'] ?? null,
            'classification_grade' => $validated['classification_grade'] ?? null,
            'bank_name' => $validated['bank_name'] ?? null,
            'bank_country' => $validated['bank_country'] ?? null,
            'bank_account_name' => $validated['bank_account_name'] ?? null,
            'bank_account_number' => $validated['bank_account_number'] ?? null,
            'iban' => $validated['iban'] ?? null,
            'swift_code' => $validated['swift_code'] ?? null,
            'preferred_currency' => $validated['preferred_currency'] ?? null,
            'payment_terms_days' => $validated['payment_terms_days'] ?? null,
            'tax_withholding_rate' => $validated['tax_withholding_rate'] ?? null,
        ], fn ($v) => $v !== null);

        $categoryIds = isset($validated['category_ids']) ? array_values(array_map('strval', $validated['category_ids'])) : null;
        $command = new UpdateSupplierCommand($supplier, $data, $categoryIds);
        $supplier = $command->handle();

        // Company logo
        if ($request->hasFile('company_logo')) {
            $supplier->clearMediaCollection('company_logo');
            $supplier->addMediaFromRequest('company_logo')->toMediaCollection('company_logo');
        }

        // Controlled replace of key supplier documents (new versioning, is_current=true)
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

        $this->activityLogger->log('suppliers.supplier.updated', $supplier, [], $supplier->toArray(), $request->user());

        $redirect = redirect()->route('suppliers.show', $supplier)->with('success', __('suppliers.updated'));

        $hasPastExpiry = false;
        foreach (['cr_expiry_date', 'vat_expiry_date', 'license_expiry_date'] as $key) {
            if (! empty($validated[$key])) {
                if (Carbon::parse((string) $validated[$key])->startOfDay()->lt(Carbon::today())) {
                    $hasPastExpiry = true;
                    break;
                }
            }
        }
        if ($hasPastExpiry) {
            $redirect->with('warning', __('suppliers.expiry_dates_in_past_note'));
        }

        return $redirect;
    }

    public function destroy(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('delete', $supplier);

        $payload = $supplier->toArray();
        $command = new DeleteSupplierCommand($supplier);
        $command->handle();

        $this->activityLogger->log('suppliers.supplier.deleted', $supplier, $payload, [], $request->user());

        return redirect()->route('suppliers.index')->with('success', __('suppliers.deleted'));
    }

    public function checkCr(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cr_number' => ['required', 'string', 'max:100'],
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
        ]);

        $supplierId = $validated['supplier_id'] ?? null;
        $exists = Supplier::withTrashed()
            ->where('commercial_registration_no', $validated['cr_number'])
            ->when($supplierId, fn ($q) => $q->where('id', '!=', $supplierId))
            ->exists();

        return response()->json([
            'available' => ! $exists,
            'message' => $exists
                ? __('suppliers.cr_check_registered_system')
                : __('suppliers.cr_check_available'),
        ]);
    }
}
