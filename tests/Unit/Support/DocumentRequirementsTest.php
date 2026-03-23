<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Models\ProcurementPackageAttachment;
use App\Models\RfqDocument;
use App\Support\DocumentRequirements;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class DocumentRequirementsTest extends TestCase
{
    #[Test]
    public function missing_for_rfq_with_inherited_package_is_empty_when_all_types_present_from_rfq_only(): void
    {
        $missing = DocumentRequirements::missingForRfqWithInheritedPackage(
            [
                RfqDocument::DOCUMENT_DRAWINGS,
                RfqDocument::DOCUMENT_SPECIFICATIONS,
                RfqDocument::DOCUMENT_BOQ,
            ],
            []
        );

        $this->assertSame([], $missing);
    }

    #[Test]
    public function missing_for_rfq_with_inherited_package_is_empty_when_all_types_present_from_package_only(): void
    {
        $missing = DocumentRequirements::missingForRfqWithInheritedPackage(
            [],
            [
                ProcurementPackageAttachment::DOCUMENT_DRAWINGS,
                ProcurementPackageAttachment::DOCUMENT_SPECIFICATIONS,
                ProcurementPackageAttachment::DOCUMENT_BOQ,
            ]
        );

        $this->assertSame([], $missing);
    }

    #[Test]
    public function missing_for_rfq_with_inherited_package_merges_sources(): void
    {
        $missing = DocumentRequirements::missingForRfqWithInheritedPackage(
            [RfqDocument::DOCUMENT_BOQ],
            [
                ProcurementPackageAttachment::DOCUMENT_DRAWINGS,
                ProcurementPackageAttachment::DOCUMENT_SPECIFICATIONS,
            ]
        );

        $this->assertSame([], $missing);
    }

    #[Test]
    public function missing_for_rfq_with_inherited_package_warns_only_when_missing_from_both(): void
    {
        $missing = DocumentRequirements::missingForRfqWithInheritedPackage(
            [RfqDocument::DOCUMENT_DRAWINGS],
            [ProcurementPackageAttachment::DOCUMENT_DRAWINGS]
        );

        $this->assertSame(
            [RfqDocument::DOCUMENT_SPECIFICATIONS, RfqDocument::DOCUMENT_BOQ],
            $missing
        );
    }
}
