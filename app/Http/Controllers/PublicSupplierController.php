<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierCategory;
use App\Models\SupplierContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class PublicSupplierController extends Controller
{
    private static function registerValidationRules(?string $supplierId = null): array
    {
        $emailRule = ['required', 'email', 'max:255'];
        if ($supplierId) {
            $emailRule[] = Rule::unique('suppliers', 'email')->ignore($supplierId);
        } else {
            $emailRule[] = 'unique:suppliers,email';
        }

        $crRule = [
            'required',
            'string',
            'max:100',
            $supplierId
                ? Rule::unique('suppliers', 'commercial_registration_no')->ignore($supplierId)
                : Rule::unique('suppliers', 'commercial_registration_no'),
            function (string $attribute, mixed $value, \Closure $fail): void {
                $blacklisted = Supplier::withTrashed()
                    ->where('commercial_registration_no', $value)
                    ->where('status', Supplier::STATUS_BLACKLISTED)
                    ->exists();
                if ($blacklisted) {
                    $fail('This CR number has been blacklisted and cannot be registered.');
                }
            },
        ];

        return [
            'legal_name_en' => ['required', 'string', 'max:255'],
            'legal_name_ar' => ['nullable', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', 'in:supplier,subcontractor,service_provider,consultant'],
            'country' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => $emailRule,
            'website' => ['nullable', 'url', 'max:255'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:supplier_categories,id'],
            'commercial_registration_no' => $crRule,
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
            'preferred_currency' => ['nullable', 'string', 'max:10', 'in:SAR,USD,EUR,AED,GBP'],
            'payment_terms_days' => ['nullable', 'integer', 'in:30,60,90,120'],
            'contacts' => ['required', 'array', 'min:1', 'max:10'],
            'contacts.*.name' => ['required', 'string', 'max:255'],
            'contacts.*.contact_type' => ['required', 'string', 'in:sales,technical,finance,contracts,management'],
            'contacts.*.email' => ['nullable', 'email', 'max:255'],
            'contacts.*.phone' => ['nullable', 'string', 'max:30'],
            'contacts.*.mobile' => ['nullable', 'string', 'max:30'],
            'contacts.*.is_primary' => ['nullable', 'boolean'],
            'contacts.*.job_title' => ['nullable', 'string', 'max:255'],
            'contacts.*.department' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function showRegistrationForm(): Response
    {
        $categories = SupplierCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'name_ar', 'slug']);

        return Inertia::render('Public/SupplierRegister', [
            'categories' => $categories,
        ]);
    }

    public function checkCr(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cr_number' => ['required', 'string', 'max:100'],
        ]);
        $crNumber = $validated['cr_number'];
        $supplierId = $request->query('supplier_id');
        $exists = Supplier::withTrashed()
            ->where('commercial_registration_no', $crNumber)
            ->when($supplierId, fn ($q) => $q->where('id', '!=', $supplierId))
            ->exists();
        $blacklisted = Supplier::withTrashed()
            ->where('commercial_registration_no', $crNumber)
            ->where('status', Supplier::STATUS_BLACKLISTED)
            ->exists();

        return response()->json([
            'available' => ! $exists && ! $blacklisted,
            'blacklisted' => $blacklisted,
            'message' => match (true) {
                $blacklisted => 'This CR number has been blacklisted and cannot be registered.',
                $exists => 'This CR number is already registered.',
                default => 'CR number is available.',
            },
        ]);
    }

    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate(self::registerValidationRules(null));

        $supplier = DB::transaction(function () use ($validated) {
            $year = now()->format('Y');
            $lastCode = Supplier::withTrashed()
                ->where('supplier_code', 'like', "SUP-{$year}-%")
                ->lockForUpdate()
                ->orderByDesc('supplier_code')
                ->value('supplier_code');
            $seq = $lastCode ? ((int) substr($lastCode, -5)) + 1 : 1;
            $supplierCode = sprintf('SUP-%s-%05d', $year, $seq);

            $data = collect($validated)->except(['contacts', 'category_ids'])->map(function ($v) {
                return $v === '' ? null : $v;
            })->all();

            $supplier = Supplier::create([
                'id' => (string) Str::uuid(),
                'supplier_code' => $supplierCode,
                'status' => Supplier::STATUS_PENDING_REGISTRATION,
                'compliance_status' => Supplier::COMPLIANCE_PENDING,
                'is_verified' => false,
                ...$data,
            ]);

            if (! empty($validated['category_ids'])) {
                $supplier->categories()->attach($validated['category_ids']);
            }

            $hasPrimary = false;
            foreach ($validated['contacts'] as $contact) {
                $contactData = $contact;
                if (! empty($contactData['is_primary'])) {
                    if ($hasPrimary) {
                        $contactData['is_primary'] = false;
                    } else {
                        $hasPrimary = true;
                    }
                }
                SupplierContact::create([
                    'id' => (string) Str::uuid(),
                    'supplier_id' => $supplier->id,
                    'name' => $contactData['name'],
                    'job_title' => $contactData['job_title'] ?? null,
                    'department' => $contactData['department'] ?? null,
                    'contact_type' => $contactData['contact_type'],
                    'email' => $contactData['email'] ?? null,
                    'phone' => $contactData['phone'] ?? null,
                    'mobile' => $contactData['mobile'] ?? null,
                    'is_primary' => ! empty($contactData['is_primary']),
                ]);
            }

            if (! $hasPrimary && ! empty($validated['contacts'])) {
                $supplier->contacts()->first()?->update(['is_primary' => true]);
            }

            $supplier->generateRegistrationToken();

            event(new \App\Events\SupplierRegistered($supplier));

            return $supplier;
        });

        return redirect()->route('supplier.success')->with([
            'supplier_code' => $supplier->supplier_code,
            'email' => $supplier->email,
            'message' => 'Registration submitted successfully.',
        ]);
    }

    public function showSuccess(Request $request): Response
    {
        return Inertia::render('Public/SupplierSuccess', [
            'supplier_code' => session('supplier_code', ''),
            'email' => session('email'),
            'message' => session('message', 'Registration submitted successfully.'),
        ]);
    }

    public function showCompleteForm(string $token): Response|RedirectResponse
    {
        $supplier = Supplier::where('registration_token', $token)
            ->where('registration_token_expires_at', '>', now())
            ->with(['categories', 'contacts'])
            ->firstOrFail();

        if ($supplier->status === Supplier::STATUS_APPROVED) {
            return redirect()->route('supplier.status')->with('info', 'Your profile is already approved.');
        }

        $categories = SupplierCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'name_ar', 'slug']);

        return Inertia::render('Public/SupplierComplete', [
            'supplier' => $supplier,
            'token' => $token,
            'categories' => $categories,
        ]);
    }

    public function completeProfile(Request $request, string $token): RedirectResponse
    {
        $supplier = Supplier::where('registration_token', $token)
            ->where('registration_token_expires_at', '>', now())
            ->firstOrFail();

        $validated = $request->validate(self::registerValidationRules($supplier->id));

        DB::transaction(function () use ($supplier, $validated) {
            $data = collect($validated)->except(['contacts', 'category_ids'])->map(function ($v) {
                return $v === '' ? null : $v;
            })->all();

            $supplier->update($data);

            if (isset($validated['category_ids'])) {
                $supplier->categories()->sync($validated['category_ids']);
            }

            $supplier->contacts()->delete();

            $hasPrimary = false;
            foreach ($validated['contacts'] ?? [] as $contact) {
                $contactData = $contact;
                if (! empty($contactData['is_primary']) && ! $hasPrimary) {
                    $hasPrimary = true;
                } elseif (! empty($contactData['is_primary'])) {
                    $contactData['is_primary'] = false;
                }
                SupplierContact::create([
                    'id' => (string) Str::uuid(),
                    'supplier_id' => $supplier->id,
                    'name' => $contactData['name'],
                    'job_title' => $contactData['job_title'] ?? null,
                    'department' => $contactData['department'] ?? null,
                    'contact_type' => $contactData['contact_type'],
                    'email' => $contactData['email'] ?? null,
                    'phone' => $contactData['phone'] ?? null,
                    'mobile' => $contactData['mobile'] ?? null,
                    'is_primary' => ! empty($contactData['is_primary']),
                ]);
            }

            if (! $hasPrimary && ! empty($validated['contacts'])) {
                $supplier->contacts()->first()?->update(['is_primary' => true]);
            }

            $supplier->update([
                'status' => Supplier::STATUS_UNDER_REVIEW,
                'registration_token' => null,
                'registration_token_expires_at' => null,
            ]);
        });

        $fresh = $supplier->fresh();
        return redirect()->route('supplier.success')->with([
            'supplier_code' => $fresh?->supplier_code ?? '',
            'email' => $fresh?->email,
            'message' => 'Profile completed successfully. Your application is under review.',
        ]);
    }

    public function showStatus(Request $request): Response
    {
        $code = $request->query('code');
        $email = $request->query('email');
        $supplier = null;
        if ($code && $email) {
            $supplier = Supplier::where('supplier_code', $code)
                ->where('email', $email)
                ->select([
                    'id', 'supplier_code', 'legal_name_en', 'status',
                    'compliance_status', 'created_at',
                    'commercial_registration_no', 'vat_number',
                    'unified_number', 'registration_token',
                    'registration_token_expires_at',
                ])
                ->with(['contacts' => fn ($q) => $q->where('is_primary', true)])
                ->first();
        }

        return Inertia::render('Public/SupplierStatus', [
            'supplier' => $supplier ? $supplier->toArray() : null,
        ]);
    }
}
