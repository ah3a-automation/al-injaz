<?php

declare(strict_types=1);

namespace App\Services\Contracts;

/**
 * Central registry of allowed contract merge-field variables.
 * Only variables declared here are valid for placeholder resolution.
 */
final class ContractVariableRegistry
{
    public const FORMATTER_DATE = 'date';

    public const FORMATTER_DATETIME = 'datetime';

    public const FORMATTER_CURRENCY = 'currency';

    public const FORMATTER_NUMBER = 'number';

    public const FORMATTER_HIJRI_DATE = 'hijri_date';

    /** @var array<string> */
    public const FORMATTERS = [
        self::FORMATTER_DATE,
        self::FORMATTER_DATETIME,
        self::FORMATTER_CURRENCY,
        self::FORMATTER_NUMBER,
        self::FORMATTER_HIJRI_DATE,
    ];

    public const GROUP_SUPPLIER = 'supplier';

    public const GROUP_CONTRACT = 'contract';

    public const GROUP_PROJECT = 'project';

    public const GROUP_RFQ = 'rfq';

    public const GROUP_QUOTE = 'quote';

    public const GROUP_SYSTEM = 'system';

    public const GROUP_MANUAL = 'manual';

    /** @var array<string, array{key: string, label_en: string, label_ar: string, group: string, source: string, data_type: string, nullable: bool, allowed_formatters: array<string>, example_value?: string}> */
    private static array $variables = [];

    private static bool $initialized = false;

    private static function init(): void
    {
        if (self::$initialized) {
            return;
        }
        self::$variables = [
            'supplier.legal_name_ar' => [
                'key' => 'supplier.legal_name_ar',
                'label_en' => 'Supplier legal name (Arabic)',
                'label_ar' => 'الاسم القانوني للمورد (عربي)',
                'group' => self::GROUP_SUPPLIER,
                'source' => 'supplier',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'supplier.legal_name_en' => [
                'key' => 'supplier.legal_name_en',
                'label_en' => 'Supplier legal name (English)',
                'label_ar' => 'الاسم القانوني للمورد (إنجليزي)',
                'group' => self::GROUP_SUPPLIER,
                'source' => 'supplier',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'supplier.commercial_registration_no' => [
                'key' => 'supplier.commercial_registration_no',
                'label_en' => 'Commercial registration number',
                'label_ar' => 'رقم السجل التجاري',
                'group' => self::GROUP_SUPPLIER,
                'source' => 'supplier',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'supplier.vat_number' => [
                'key' => 'supplier.vat_number',
                'label_en' => 'VAT number',
                'label_ar' => 'الرقم الضريبي',
                'group' => self::GROUP_SUPPLIER,
                'source' => 'supplier',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'contract.number' => [
                'key' => 'contract.number',
                'label_en' => 'Contract number',
                'label_ar' => 'رقم العقد',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'contract.value' => [
                'key' => 'contract.value',
                'label_en' => 'Contract value',
                'label_ar' => 'قيمة العقد',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'decimal',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_CURRENCY, self::FORMATTER_NUMBER],
            ],
            'contract.start_date' => [
                'key' => 'contract.start_date',
                'label_en' => 'Contract start date',
                'label_ar' => 'تاريخ بداية العقد',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'date',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_DATE, self::FORMATTER_DATETIME, self::FORMATTER_HIJRI_DATE],
            ],
            'contract.end_date' => [
                'key' => 'contract.end_date',
                'label_en' => 'Contract end date',
                'label_ar' => 'تاريخ نهاية العقد',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'date',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_DATE, self::FORMATTER_DATETIME, self::FORMATTER_HIJRI_DATE],
            ],
            'contract.duration_days' => [
                'key' => 'contract.duration_days',
                'label_en' => 'Contract duration (days)',
                'label_ar' => 'مدة العقد (أيام)',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'integer',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_NUMBER],
            ],
            'contract.title_ar' => [
                'key' => 'contract.title_ar',
                'label_en' => 'Contract title (Arabic)',
                'label_ar' => 'عنوان العقد (عربي)',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'contract.title_en' => [
                'key' => 'contract.title_en',
                'label_en' => 'Contract title (English)',
                'label_ar' => 'عنوان العقد (إنجليزي)',
                'group' => self::GROUP_CONTRACT,
                'source' => 'contract',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'project.name_ar' => [
                'key' => 'project.name_ar',
                'label_en' => 'Project name (Arabic)',
                'label_ar' => 'اسم المشروع (عربي)',
                'group' => self::GROUP_PROJECT,
                'source' => 'project',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'project.name_en' => [
                'key' => 'project.name_en',
                'label_en' => 'Project name (English)',
                'label_ar' => 'اسم المشروع (إنجليزي)',
                'group' => self::GROUP_PROJECT,
                'source' => 'project',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'project.code' => [
                'key' => 'project.code',
                'label_en' => 'Project code',
                'label_ar' => 'رمز المشروع',
                'group' => self::GROUP_PROJECT,
                'source' => 'project',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'rfq.number' => [
                'key' => 'rfq.number',
                'label_en' => 'RFQ number',
                'label_ar' => 'رقم طلب العرض',
                'group' => self::GROUP_RFQ,
                'source' => 'rfq',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'rfq.title' => [
                'key' => 'rfq.title',
                'label_en' => 'RFQ title',
                'label_ar' => 'عنوان طلب العرض',
                'group' => self::GROUP_RFQ,
                'source' => 'rfq',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'quote.total_value' => [
                'key' => 'quote.total_value',
                'label_en' => 'Awarded quote total value',
                'label_ar' => 'إجمالي قيمة العرض الفائز',
                'group' => self::GROUP_QUOTE,
                'source' => 'quote',
                'data_type' => 'decimal',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_CURRENCY, self::FORMATTER_NUMBER],
            ],
            'quote.submitted_at' => [
                'key' => 'quote.submitted_at',
                'label_en' => 'Quote submitted at',
                'label_ar' => 'تاريخ تقديم العرض',
                'group' => self::GROUP_QUOTE,
                'source' => 'quote',
                'data_type' => 'datetime',
                'nullable' => true,
                'allowed_formatters' => [self::FORMATTER_DATE, self::FORMATTER_DATETIME, self::FORMATTER_HIJRI_DATE],
            ],
            'today' => [
                'key' => 'today',
                'label_en' => 'Today\'s date',
                'label_ar' => 'تاريخ اليوم',
                'group' => self::GROUP_SYSTEM,
                'source' => 'system',
                'data_type' => 'date',
                'nullable' => false,
                'allowed_formatters' => [self::FORMATTER_DATE, self::FORMATTER_DATETIME, self::FORMATTER_HIJRI_DATE],
            ],
            'today.hijri' => [
                'key' => 'today.hijri',
                'label_en' => 'Today (Hijri)',
                'label_ar' => 'تاريخ اليوم (هجري)',
                'group' => self::GROUP_SYSTEM,
                'source' => 'system',
                'data_type' => 'string',
                'nullable' => false,
                'allowed_formatters' => [],
            ],
            'manual.final_offer_reference_ar' => [
                'key' => 'manual.final_offer_reference_ar',
                'label_en' => 'Final offer reference (Arabic)',
                'label_ar' => 'مرجع العرض النهائي (عربي)',
                'group' => self::GROUP_MANUAL,
                'source' => 'manual',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'manual.final_offer_reference_en' => [
                'key' => 'manual.final_offer_reference_en',
                'label_en' => 'Final offer reference (English)',
                'label_ar' => 'مرجع العرض النهائي (إنجليزي)',
                'group' => self::GROUP_MANUAL,
                'source' => 'manual',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'manual.special_scope_note_ar' => [
                'key' => 'manual.special_scope_note_ar',
                'label_en' => 'Special scope note (Arabic)',
                'label_ar' => 'ملاحظة نطاق خاصة (عربي)',
                'group' => self::GROUP_MANUAL,
                'source' => 'manual',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
            'manual.special_scope_note_en' => [
                'key' => 'manual.special_scope_note_en',
                'label_en' => 'Special scope note (English)',
                'label_ar' => 'ملاحظة نطاق خاصة (إنجليزي)',
                'group' => self::GROUP_MANUAL,
                'source' => 'manual',
                'data_type' => 'string',
                'nullable' => true,
                'allowed_formatters' => [],
            ],
        ];
        self::$initialized = true;
    }

    /**
     * @return array<string, array{key: string, label_en: string, label_ar: string, group: string, source: string, data_type: string, nullable: bool, allowed_formatters: array<string>, example_value?: string}>
     */
    public static function getVariables(): array
    {
        self::init();

        return self::$variables;
    }

    /**
     * @return array<string, array<int, array{key: string, label_en: string, label_ar: string, group: string, source: string, data_type: string, nullable: bool, allowed_formatters: array<string>, example_value?: string}>>
     */
    public static function getGrouped(): array
    {
        self::init();
        $grouped = [];
        foreach (self::$variables as $def) {
            $grouped[$def['group']][] = $def;
        }

        return $grouped;
    }

    public static function has(string $key): bool
    {
        self::init();

        return isset(self::$variables[$key]);
    }

    /**
     * @return array{key: string, label_en: string, label_ar: string, group: string, source: string, data_type: string, nullable: bool, allowed_formatters: array<string>, example_value?: string}|null
     */
    public static function get(string $key): ?array
    {
        self::init();

        return self::$variables[$key] ?? null;
    }

    public static function isAllowedSource(string $key): bool
    {
        $parts = explode('.', $key, 2);
        $source = $parts[0] ?? '';
        $allowed = ['supplier', 'contract', 'project', 'rfq', 'quote', 'today', 'manual'];

        return in_array($source, $allowed, true);
    }
}
