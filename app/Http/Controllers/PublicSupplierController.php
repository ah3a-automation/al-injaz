<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierCategory;
use App\Models\SupplierContact;
use App\Models\SupplierDocument;
use App\Models\User;
use App\Rules\SaudiCommercialRegistrationNumber;
use App\Rules\SaudiVatNumber;
use App\Support\SupplierPhoneNormalizer;
use Illuminate\Support\Facades\Storage;
use App\Rules\CityBelongsToCountry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
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
            $emailRule[] = Rule::unique('suppliers', 'email');
            $emailRule[] = Rule::unique('users', 'email');
        }

        $crRule = [
            'required',
            'string',
            'max:100',
            new SaudiCommercialRegistrationNumber(),
            $supplierId
                ? Rule::unique('suppliers', 'commercial_registration_no')->ignore($supplierId)
                : Rule::unique('suppliers', 'commercial_registration_no'),
            function (string $attribute, mixed $value, \Closure $fail): void {
                $blacklisted = Supplier::withTrashed()
                    ->where('commercial_registration_no', $value)
                    ->where('status', Supplier::STATUS_BLACKLISTED)
                    ->exists();
                if ($blacklisted) {
                    $fail(__('suppliers.cr_blacklisted_registration'));
                }
            },
        ];

        $rules = [
            'legal_name_en' => ['required', 'string', 'max:255'],
            'legal_name_ar' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'supplier_type' => ['required', 'string', 'in:supplier,subcontractor,service_provider,consultant'],
            'country' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100', new CityBelongsToCountry],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => $emailRule,
            'website' => ['nullable', 'string', 'max:255'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['uuid', 'exists:supplier_categories,id'],
            'commercial_registration_no' => $crRule,
            'cr_expiry_date' => ['nullable', 'date', 'after_or_equal:today'],
            'vat_number' => ['nullable', 'string', 'max:100'],
            'unified_number' => ['required', 'string', 'max:100'],
            'business_license_number' => ['nullable', 'string', 'max:100'],
            'license_expiry_date' => ['nullable', 'date', 'after_or_equal:today'],
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
            'contacts.*.business_card_front' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'contacts.*.business_card_back' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ];

        if ($supplierId === null) {
            // Must match frontend `passwordPolicy.ts` (min 8, upper, lower, number).
            $rules['password'] = ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()];
            $rules['avatar'] = ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:2048'];
            $rules['company_logo'] = ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:2048'];
            $rules['cr_document'] = [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:5120',
            ];
            $rules['vat_document'] = [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:5120',
            ];
            $rules['unified_document'] = [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:5120',
            ];
            $rules['bank_certificate'] = [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:5120',
            ];
        }

        return $rules;
    }

    /**
     * Validates category IDs for public registration: active, non-legacy, leaf only.
     * Does not enforce supplier_type ↔ category coupling.
     *
     * @param  list<string>  $categoryIds
     */
    private static function validateRegistrationCategoryIds(array $categoryIds): ?string
    {
        if ($categoryIds === []) {
            return null;
        }

        $invalidState = SupplierCategory::query()
            ->whereIn('id', $categoryIds)
            ->where(function ($q): void {
                $q->where('is_active', false)
                    ->orWhere('is_legacy', true);
            })
            ->exists();

        if ($invalidState) {
            return __('supplier_categories.invalid_category_selection');
        }

        $nonLeaf = SupplierCategory::query()
            ->whereIn('id', $categoryIds)
            ->whereHas('children')
            ->exists();

        if ($nonLeaf) {
            return __('supplier_categories.categories_must_be_leaf');
        }

        return null;
    }

    /** @return array<string, string> */
    private static function registerUploadValidationMessages(): array
    {
        return [
            'avatar.mimes' => __('supplier_portal.invalid_file_format'),
            'avatar.max' => __('supplier_portal.file_too_large'),
            'company_logo.mimes' => __('supplier_portal.invalid_file_format'),
            'company_logo.max' => __('supplier_portal.file_too_large'),
        ];
    }

    /**
     * Business validation copy (duplicates, password policy) for public registration.
     *
     * @return array<string, string>
     */
    private static function registerBusinessValidationMessages(): array
    {
        return [
            'email.unique' => __('supplier_portal.registration_email_duplicate'),
            'commercial_registration_no.unique' => __('supplier_portal.registration_cr_duplicate'),
            'password.min' => __('supplier_portal.password_rule_min_length'),
            'password.mixed' => __('supplier_portal.password_rule_mixed'),
            'password.numbers' => __('supplier_portal.password_rule_numbers'),
            'password.letters' => __('supplier_portal.password_rule_letters'),
            'password.confirmed' => __('supplier_portal.passwords_do_not_match'),
        ];
    }

    /**
     * @return array<string, string>
     */
    private static function registerAllValidationMessages(): array
    {
        return array_merge(
            self::registerUploadValidationMessages(),
            self::registerBusinessValidationMessages()
        );
    }

    public function showRegistrationForm(): Response
    {
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

        return Inertia::render('Public/SupplierRegister', [
            'layoutMaxWidth' => 'max-w-6xl',
            'categories' => $categories,
            'locations' => config('locations.countries', []),
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
                $blacklisted => __('suppliers.cr_blacklisted_registration'),
                $exists => __('suppliers.cr_check_registered'),
                default => __('suppliers.cr_check_available'),
            },
        ]);
    }

    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate(self::registerValidationRules(null), self::registerAllValidationMessages());

        $validated['phone'] = SupplierPhoneNormalizer::normalize($validated['phone'] ?? null);
        foreach ($validated['contacts'] ?? [] as $i => $contact) {
            $validated['contacts'][$i]['phone'] = SupplierPhoneNormalizer::normalize($contact['phone'] ?? null);
            $validated['contacts'][$i]['mobile'] = SupplierPhoneNormalizer::normalize($contact['mobile'] ?? null);
        }

        if (! empty($validated['website']) && ! str_starts_with($validated['website'], 'http')) {
            $validated['website'] = 'https://' . ltrim($validated['website'], '/');
        }

        $categoryIds = $validated['category_ids'] ?? [];
        $categoryError = self::validateRegistrationCategoryIds($categoryIds);
        if ($categoryError !== null) {
            return redirect()->back()->withErrors(['category_ids' => $categoryError])->withInput();
        }

        $supplier = DB::transaction(function () use ($validated, $request) {
            $year = now()->format('Y');
            $lastCode = Supplier::withTrashed()
                ->where('supplier_code', 'like', "SUP-{$year}-%")
                ->lockForUpdate()
                ->orderByDesc('supplier_code')
                ->value('supplier_code');
            $seq = $lastCode ? ((int) substr($lastCode, -5)) + 1 : 1;
            $supplierCode = sprintf('SUP-%s-%05d', $year, $seq);

            $data = collect($validated)->except([
                'contacts', 'category_ids', 'password', 'password_confirmation',
                'avatar', 'company_logo', 'cr_document', 'vat_document', 'unified_document', 'bank_certificate',
            ])->map(function ($v) {
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

            $supplierUser = User::create([
                'name' => $supplier->legal_name_en,
                'email' => $supplier->email,
                'password' => $validated['password'],
                'status' => User::STATUS_ACTIVE,
                'must_change_password' => false,
            ]);
            $supplierUser->assignRole('supplier');
            $supplier->update(['supplier_user_id' => $supplierUser->id]);

            if (! empty($validated['category_ids'])) {
                $supplier->categories()->attach($validated['category_ids']);
            }

            $hasPrimary = false;
            foreach ($validated['contacts'] as $index => $contact) {
                $contactData = $contact;
                if (! empty($contactData['is_primary'])) {
                    if ($hasPrimary) {
                        $contactData['is_primary'] = false;
                    } else {
                        $hasPrimary = true;
                    }
                }
                $newContact = SupplierContact::create([
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
                if (! empty($contactData['business_card_front']) && $contactData['business_card_front'] instanceof \Illuminate\Http\UploadedFile) {
                    $newContact->addMedia($contactData['business_card_front'])->toMediaCollection('business_card_front');
                }
                if (! empty($contactData['business_card_back']) && $contactData['business_card_back'] instanceof \Illuminate\Http\UploadedFile) {
                    $newContact->addMedia($contactData['business_card_back'])->toMediaCollection('business_card_back');
                }
            }

            if (! $hasPrimary && ! empty($validated['contacts'])) {
                $supplier->contacts()->first()?->update(['is_primary' => true]);
            }

            $firstContact = $supplier->contacts()->first();
            if ($firstContact && $request->hasFile('avatar')) {
                $firstContact->addMediaFromRequest('avatar')->toMediaCollection('avatar');
            }

            if ($request->hasFile('company_logo')) {
                $supplier->addMediaFromRequest('company_logo')->toMediaCollection('company_logo');
            }

            $uploadedBy = $supplier->supplier_user_id ?: null;
            if ($request->hasFile('cr_document')) {
                SupplierDocument::createVersionedUpload(
                    $supplier,
                    $request->file('cr_document'),
                    SupplierDocument::TYPE_CR,
                    $uploadedBy,
                );
            }
            if ($request->hasFile('vat_document')) {
                SupplierDocument::createVersionedUpload(
                    $supplier,
                    $request->file('vat_document'),
                    SupplierDocument::TYPE_VAT,
                    $uploadedBy,
                );
            }
            if ($request->hasFile('unified_document')) {
                SupplierDocument::createVersionedUpload(
                    $supplier,
                    $request->file('unified_document'),
                    SupplierDocument::TYPE_UNIFIED,
                    $uploadedBy,
                );
            }
            if ($request->hasFile('bank_certificate')) {
                SupplierDocument::createVersionedUpload(
                    $supplier,
                    $request->file('bank_certificate'),
                    SupplierDocument::TYPE_BANK_LETTER,
                    $uploadedBy,
                );
            }

            $supplier->generateRegistrationToken();

            event(new \App\Events\SupplierRegistered($supplier));

            return $supplier;
        });

        return redirect()->route('supplier.success')->with([
            'supplier_code' => $supplier->supplier_code,
            'email' => $supplier->email,
            'message' => __('supplier_portal.registration_submitted_flash'),
        ]);
    }

    public function showSuccess(Request $request): Response
    {
        return Inertia::render('Public/SupplierSuccess', [
            'supplier_code' => session('supplier_code', ''),
            'email' => session('email'),
            'message' => session('message', __('supplier_portal.registration_submitted_flash')),
        ]);
    }

    public function showCompleteForm(string $token): Response|RedirectResponse
    {
        $supplier = Supplier::where('registration_token', $token)
            ->where('registration_token_expires_at', '>', now())
            ->with(['categories', 'contacts'])
            ->firstOrFail();

        if ($supplier->status === Supplier::STATUS_APPROVED) {
            return redirect()->route('supplier.status')->with('info', __('supplier_portal.profile_already_approved_info'));
        }

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

        $validated['phone'] = SupplierPhoneNormalizer::normalize($validated['phone'] ?? null);
        foreach ($validated['contacts'] ?? [] as $i => $contact) {
            $validated['contacts'][$i]['phone'] = SupplierPhoneNormalizer::normalize($contact['phone'] ?? null);
            $validated['contacts'][$i]['mobile'] = SupplierPhoneNormalizer::normalize($contact['mobile'] ?? null);
        }

        $categoryIds = $validated['category_ids'] ?? [];
        $categoryError = self::validateRegistrationCategoryIds($categoryIds);
        if ($categoryError !== null) {
            return redirect()->back()->withErrors(['category_ids' => $categoryError])->withInput();
        }

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
            'message' => __('supplier_portal.profile_completed_flash'),
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
