<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Suppliers\Commands\ApproveSupplierCommand;
use App\Application\Suppliers\Commands\CreateSupplierCommand;
use App\Application\Suppliers\Commands\DeleteSupplierCommand;
use App\Application\Suppliers\Commands\UpdateSupplierCommand;
use App\Application\Suppliers\Queries\GetSupplierQuery;
use App\Application\Suppliers\Queries\ListSuppliersQuery;
use App\Models\Certification;
use App\Models\Supplier;
use App\Models\SupplierCapability;
use App\Models\SupplierCategory;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class SupplierController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Supplier::class);

        $query = new ListSuppliersQuery(
            q: $request->input('q'),
            status: $request->input('status'),
            supplierType: $request->input('supplier_type'),
            country: $request->input('country'),
            categoryId: $request->input('category_id') ? (int) $request->input('category_id') : null,
            sortField: (string) $request->input('sort_field', 'created_at'),
            sortDir: (string) $request->input('sort_dir', 'desc'),
            perPage: (int) $request->input('per_page', 25),
            page: (int) $request->input('page', 1),
        );
        $suppliers = $query->handle();

        $categories = SupplierCategory::where('is_active', true)->orderBy('sort_order')->get(['id', 'name']);
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

        $categories = SupplierCategory::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'name_ar']);

        return Inertia::render('Suppliers/Create', [
            'categories' => $categories,
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
            'category_ids.*' => ['integer', 'exists:supplier_categories,id'],
        ]);

        $command = new CreateSupplierCommand(
            legalNameEn: $validated['legal_name_en'],
            country: $validated['country'],
            city: $validated['city'],
            supplierType: $validated['supplier_type'],
            legalNameAr: $validated['legal_name_ar'] ?? null,
            tradeName: $validated['trade_name'] ?? null,
            phone: $validated['phone'] ?? null,
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

        return redirect()->route('suppliers.show', $supplier)->with('success', 'Supplier created.');
    }

    public function show(Request $request, Supplier $supplier): Response
    {
        $this->authorize('view', $supplier);

        $getQuery = new GetSupplierQuery($supplier->id);
        $supplier = $getQuery->handle();

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
            'canApprove' => $request->user()->can('suppliers.approve'),
            'can' => [
                'update' => $request->user()->can('suppliers.edit'),
                'delete' => $request->user()->can('suppliers.delete'),
            ],
        ]);
    }

    public function edit(Request $request, Supplier $supplier): Response
    {
        $this->authorize('update', $supplier);

        $supplier->load(['categories', 'contacts', 'capabilities', 'certifications', 'zones']);
        $categories = SupplierCategory::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'name_ar']);
        $availableCapabilities = SupplierCapability::with('category')
            ->where('is_active', true)
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get();
        $availableCertifications = Certification::where('is_active', true)->orderBy('sort_order')->get();
        $saudiZones = \App\Constants\SaudiZones::ZONES;

        return Inertia::render('Suppliers/Edit', [
            'supplier' => $supplier,
            'categories' => $categories,
            'availableCapabilities' => $availableCapabilities,
            'availableCertifications' => $availableCertifications,
            'saudiZones' => $saudiZones,
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
            'category_ids.*' => ['integer', 'exists:supplier_categories,id'],
            'commercial_registration_no' => ['nullable', 'string', 'max:100', Rule::unique('suppliers', 'commercial_registration_no')->ignore($supplier->id)],
            'cr_expiry_date' => ['nullable', 'date', 'after:today'],
            'vat_number' => ['nullable', 'string', 'max:100'],
            'unified_number' => ['nullable', 'string', 'max:100'],
            'business_license_number' => ['nullable', 'string', 'max:100'],
            'license_expiry_date' => ['nullable', 'date', 'after:today'],
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
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'tax_withholding_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'risk_score' => ['nullable', 'integer', 'between:0,100'],
        ]);

        $data = array_filter([
            'legal_name_en' => $validated['legal_name_en'],
            'legal_name_ar' => $validated['legal_name_ar'] ?? null,
            'trade_name' => $validated['trade_name'] ?? null,
            'supplier_type' => $validated['supplier_type'],
            'country' => $validated['country'],
            'city' => $validated['city'],
            'postal_code' => $validated['postal_code'] ?? null,
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'website' => $validated['website'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'commercial_registration_no' => $validated['commercial_registration_no'] ?? null,
            'cr_expiry_date' => $validated['cr_expiry_date'] ?? null,
            'vat_number' => $validated['vat_number'] ?? null,
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
            'credit_limit' => $validated['credit_limit'] ?? null,
            'tax_withholding_rate' => $validated['tax_withholding_rate'] ?? null,
            'risk_score' => $validated['risk_score'] ?? null,
        ], fn ($v) => $v !== null);

        $categoryIds = isset($validated['category_ids']) ? array_values($validated['category_ids']) : null;
        $command = new UpdateSupplierCommand($supplier, $data, $categoryIds);
        $supplier = $command->handle();

        $this->activityLogger->log('suppliers.supplier.updated', $supplier, [], $supplier->toArray(), $request->user());

        return redirect()->route('suppliers.show', $supplier)->with('success', 'Supplier updated.');
    }

    public function destroy(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('delete', $supplier);

        $payload = $supplier->toArray();
        $command = new DeleteSupplierCommand($supplier);
        $command->handle();

        $this->activityLogger->log('suppliers.supplier.deleted', $supplier, $payload, [], $request->user());

        return redirect()->route('suppliers.index')->with('success', 'Supplier deleted.');
    }

    public function approve(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('approve', $supplier);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:approved,suspended,blacklisted,under_review'],
        ]);

        $command = new ApproveSupplierCommand(
            $supplier,
            $validated['status'],
            $request->user()->id
        );
        $supplier = $command->handle();

        $this->activityLogger->log('suppliers.supplier.status_changed', $supplier, [], $supplier->toArray(), $request->user());

        return redirect()->route('suppliers.show', $supplier)->with('success', 'Supplier status updated.');
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
                ? 'This CR number is already registered in the system.'
                : 'CR number is available.',
        ]);
    }
}
