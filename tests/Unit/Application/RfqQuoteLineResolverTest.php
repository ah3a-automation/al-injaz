<?php

declare(strict_types=1);

namespace Tests\Unit\Application;

use App\Application\Procurement\Services\RfqQuoteLineResolver;
use App\Models\RfqItem;
use App\Models\RfqQuoteItem;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

final class RfqQuoteLineResolverTest extends TestCase
{
    private function rfqItem(float $qty = 2.0): RfqItem
    {
        $i = new RfqItem;
        $i->id = '00000000-0000-0000-0000-000000000001';
        $i->qty = $qty;

        return $i;
    }

    #[Test]
    public function included_line_forces_zero_totals(): void
    {
        $item = $this->rfqItem();
        $r = RfqQuoteLineResolver::resolveForPersistence($item, [
            'included_in_other' => true,
            'unit_price' => 99,
        ]);

        $this->assertSame(RfqQuoteLineResolver::STATE_INCLUDED, $r['state']);
        $this->assertSame(0.0, $r['unit_price']);
        $this->assertSame(0.0, $r['total_price']);
        $this->assertTrue($r['included_in_other']);
    }

    #[Test]
    public function empty_unit_price_means_unpriced(): void
    {
        $item = $this->rfqItem();
        $r = RfqQuoteLineResolver::resolveForPersistence($item, [
            'included_in_other' => false,
            'unit_price' => null,
        ]);

        $this->assertSame(RfqQuoteLineResolver::STATE_UNPRICED, $r['state']);
        $this->assertNull($r['unit_price']);
        $this->assertNull($r['total_price']);
    }

    #[Test]
    public function zero_unit_price_is_priced_not_unpriced(): void
    {
        $item = $this->rfqItem(2);
        $r = RfqQuoteLineResolver::resolveForPersistence($item, [
            'included_in_other' => false,
            'unit_price' => 0,
        ]);

        $this->assertSame(RfqQuoteLineResolver::STATE_PRICED, $r['state']);
        $this->assertSame(0.0, $r['unit_price']);
        $this->assertSame(0.0, $r['total_price']);
    }

    #[Test]
    public function negative_unit_price_throws(): void
    {
        $this->expectException(RuntimeException::class);
        RfqQuoteLineResolver::resolveForPersistence($this->rfqItem(), [
            'included_in_other' => false,
            'unit_price' => -1,
        ]);
    }

    #[Test]
    public function summarize_counts_priced_included_unpriced_and_total(): void
    {
        $i1 = new RfqItem;
        $i1->id = 'a0000000-0000-0000-0000-000000000001';
        $i1->qty = 2;
        $i2 = new RfqItem;
        $i2->id = 'b0000000-0000-0000-0000-000000000002';
        $i2->qty = 1;
        $i3 = new RfqItem;
        $i3->id = 'c0000000-0000-0000-0000-000000000003';
        $i3->qty = 1;

        $q1 = new RfqQuoteItem;
        $q1->rfq_item_id = $i1->id;
        $q1->unit_price = 10;
        $q1->total_price = 20;
        $q1->included_in_other = false;

        $q2 = new RfqQuoteItem;
        $q2->rfq_item_id = $i2->id;
        $q2->unit_price = 0;
        $q2->total_price = 0;
        $q2->included_in_other = true;

        $q3 = new RfqQuoteItem;
        $q3->rfq_item_id = $i3->id;
        $q3->unit_price = null;
        $q3->total_price = null;
        $q3->included_in_other = false;

        $summary = RfqQuoteLineResolver::summarize(
            new Collection([$i1, $i2, $i3]),
            null,
            new Collection([$q1, $q2, $q3])
        );

        $this->assertSame(3, $summary['total_items']);
        $this->assertSame(1, $summary['priced_items_count']);
        $this->assertSame(1, $summary['included_items_count']);
        $this->assertSame(1, $summary['unpriced_items_count']);
        $this->assertSame(20.0, $summary['total_quotation_amount']);
    }
}
