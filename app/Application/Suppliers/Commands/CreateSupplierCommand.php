<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateSupplierCommand
{
    public function __construct(
        private readonly string $legalNameEn,
        private readonly string $country,
        private readonly string $city,
        private readonly string $supplierType = Supplier::TYPE_SUPPLIER,
        private readonly ?string $legalNameAr = null,
        private readonly ?string $tradeName = null,
        private readonly ?string $phone = null,
        private readonly ?string $email = null,
        private readonly ?string $website = null,
        private readonly ?string $postalCode = null,
        private readonly ?string $address = null,
        private readonly ?string $notes = null,
        private readonly ?int $createdByUserId = null,
        private readonly array $categoryIds = [],
    ) {}

    public function handle(): Supplier
    {
        $supplier = null;

        DB::transaction(function () use (&$supplier) {
            $year = now()->format('Y');
            $lastCode = Supplier::withTrashed()
                ->where('supplier_code', 'like', "SUP-{$year}-%")
                ->lockForUpdate()
                ->orderByDesc('supplier_code')
                ->value('supplier_code');
            $seq = $lastCode ? ((int) substr($lastCode, -5)) + 1 : 1;
            $supplierCode = sprintf('SUP-%s-%05d', $year, $seq);

            $supplier = Supplier::create([
                'id' => (string) Str::uuid(),
                'supplier_code' => $supplierCode,
                'legal_name_en' => $this->legalNameEn,
                'legal_name_ar' => $this->legalNameAr,
                'trade_name' => $this->tradeName,
                'supplier_type' => $this->supplierType,
                'country' => $this->country,
                'city' => $this->city,
                'postal_code' => $this->postalCode,
                'address' => $this->address,
                'phone' => $this->phone,
                'email' => $this->email,
                'website' => $this->website,
                'notes' => $this->notes,
                'status' => Supplier::STATUS_PENDING_REGISTRATION,
                'compliance_status' => Supplier::COMPLIANCE_PENDING,
                'created_by_user_id' => $this->createdByUserId,
            ]);

            if (! empty($this->categoryIds)) {
                $supplier->categories()->attach($this->categoryIds);
            }
        });

        return $supplier;
    }
}
