<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Supplier;
use App\Models\SupplierDocument;

final class SupplierCompletenessCalculator
{
    /**
     * @var array<int, string>
     */
    private const REQUIRED_FIELDS = [
        'legal_name_en',
        'legal_name_ar',
        'email',
        'phone',
        'commercial_registration_no',
        'vat_number',
        'unified_number',
        'iban',
        'city',
        'country',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function calculate(Supplier $supplier): array
    {
        $fieldsDone = count(array_filter(
            self::REQUIRED_FIELDS,
            static fn (string $field): bool => ! empty($supplier->{$field})
        ));

        $fieldsTotal = count(self::REQUIRED_FIELDS);

        $mandatoryTypes = SupplierDocument::MANDATORY_TYPES;

        $uploadedTypes = $supplier->documents()
            ->whereIn('document_type', $mandatoryTypes)
            ->whereNull('deleted_at')
            ->where('is_current', true)
            ->pluck('document_type')
            ->unique()
            ->toArray();

        $docsDone = count(array_intersect($mandatoryTypes, $uploadedTypes));
        $docsTotal = count($mandatoryTypes);

        $total = $fieldsTotal + $docsTotal;
        $done = $fieldsDone + $docsDone;
        $percent = $total > 0 ? (int) round(($done / $total) * 100) : 0;

        return [
            'percent' => $percent,
            'fields_done' => $fieldsDone,
            'fields_total' => $fieldsTotal,
            'docs_done' => $docsDone,
            'docs_total' => $docsTotal,
            'missing_fields' => array_values(array_filter(
                self::REQUIRED_FIELDS,
                static fn (string $field): bool => empty($supplier->{$field})
            )),
            'missing_docs' => array_values(array_diff($mandatoryTypes, $uploadedTypes)),
        ];
    }
}

