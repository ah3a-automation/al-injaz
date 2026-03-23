<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ProcurementPackageAttachment;
use App\Models\RfqDocument;
use App\Models\SupplierDocument;

final class DocumentRequirements
{
    /**
     * Required types for procurement packages.
     *
     * These align with the IMPORTANT_ATTACHMENT_TYPES used on the
     * Procurement Package Create page.
     *
     * @var array<int, string>
     */
    public const PACKAGE_REQUIRED = [
        ProcurementPackageAttachment::DOCUMENT_DRAWINGS,
        ProcurementPackageAttachment::DOCUMENT_SPECIFICATIONS,
    ];

    /**
     * Required types for RFQs.
     *
     * @var array<int, string>
     */
    public const RFQ_REQUIRED = [
        RfqDocument::DOCUMENT_DRAWINGS,
        RfqDocument::DOCUMENT_SPECIFICATIONS,
        RfqDocument::DOCUMENT_BOQ,
    ];

    /**
     * Required types for suppliers, based on mandatory supplier document
     * types already defined on the SupplierDocument model.
     *
     * @var array<int, string>
     */
    public const SUPPLIER_REQUIRED = SupplierDocument::MANDATORY_TYPES;

    /**
     * @param array<int, string|null> $uploadedTypes
     *
     * @return array<int, string>
     */
    public static function missingForPackage(array $uploadedTypes): array
    {
        $uploaded = self::normalizeTypes($uploadedTypes);

        return array_values(array_diff(self::PACKAGE_REQUIRED, $uploaded));
    }

    /**
     * @param array<int, string|null> $uploadedTypes
     *
     * @return array<int, string>
     */
    public static function missingForRfq(array $uploadedTypes): array
    {
        $uploaded = self::normalizeTypes($uploadedTypes);

        return array_values(array_diff(self::RFQ_REQUIRED, $uploaded));
    }

    /**
     * Required RFQ document types are satisfied by RFQ-specific uploads and/or
     * inherited procurement package attachments (same document_type vocabulary).
     *
     * @param array<int, string|null> $rfqDocumentTypes Current RFQ document rows (typically is_current)
     * @param array<int, string|null> $packageAttachmentDocumentTypes Package attachment document_type values (typically is_current)
     *
     * @return array<int, string>
     */
    public static function missingForRfqWithInheritedPackage(array $rfqDocumentTypes, array $packageAttachmentDocumentTypes): array
    {
        $merged = self::normalizeTypes(array_merge($rfqDocumentTypes, $packageAttachmentDocumentTypes));

        return array_values(array_diff(self::RFQ_REQUIRED, $merged));
    }

    /**
     * @param array<int, string|null> $uploadedTypes
     *
     * @return array<int, string>
     */
    public static function missingForSupplier(array $uploadedTypes): array
    {
        $uploaded = self::normalizeTypes($uploadedTypes);

        return array_values(array_diff(self::SUPPLIER_REQUIRED, $uploaded));
    }

    /**
     * @param array<int, string|null> $types
     *
     * @return array<int, string>
     */
    private static function normalizeTypes(array $types): array
    {
        $normalized = [];

        foreach ($types as $type) {
            if ($type === null || $type === '') {
                continue;
            }

            $normalized[] = (string) $type;
        }

        return array_values(array_unique($normalized));
    }
}

