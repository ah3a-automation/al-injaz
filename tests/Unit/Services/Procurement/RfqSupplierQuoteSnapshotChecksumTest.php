<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Procurement;

use App\Services\Procurement\RfqSupplierQuoteSnapshotChecksum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RfqSupplierQuoteSnapshotChecksumTest extends TestCase
{
    #[Test]
    public function compute_is_deterministic_for_same_payload(): void
    {
        $a = ['rfq_id' => 'x', 'items' => [['z' => 1]], 'm' => ['b' => 2, 'a' => 1]];
        $b = ['m' => ['a' => 1, 'b' => 2], 'rfq_id' => 'x', 'items' => [['z' => 1]]];

        $this->assertSame(
            RfqSupplierQuoteSnapshotChecksum::compute($a),
            RfqSupplierQuoteSnapshotChecksum::compute($b)
        );
    }

    #[Test]
    public function compute_changes_when_payload_changes(): void
    {
        $a = ['k' => 1];
        $b = ['k' => 2];

        $this->assertNotSame(
            RfqSupplierQuoteSnapshotChecksum::compute($a),
            RfqSupplierQuoteSnapshotChecksum::compute($b)
        );
    }
}
