<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MarginException;
use App\Models\PackageBoqItem;
use App\Models\PurchaseRequest;
use App\Models\Rfq;
use App\Models\SupplierQuote;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BudgetConsumptionService
{
    public function __construct(
        private readonly ActivityLogger $activityLogger
    ) {}

    /**
     * Add consumed cost from approved Purchase Request items.
     * Call within transaction; activity log runs after commit.
     */
    public function addConsumptionFromPurchaseRequest(PurchaseRequest $pr, User $user): void
    {
        foreach ($pr->items as $item) {
            if (!$item->boq_item_id) {
                continue;
            }
            $packageId = $item->package_id ?? $pr->package_id;
            if (!$packageId) {
                continue;
            }
            $amount = (float) $item->estimated_cost;
            if ($amount <= 0) {
                continue;
            }
            $qty = config('boq.qty_tracking_enabled', false) ? (float) ($item->qty ?? 0) : null;
            $this->addConsumption(
                $packageId,
                $item->boq_item_id,
                $amount,
                $qty,
                'purchase_request_approved',
                $pr->id,
                $user
            );
        }
    }

    /**
     * Add consumed cost from RFQ award using winning quote items.
     * Call within transaction; activity log runs after commit.
     */
    public function addConsumptionFromRfqAward(Rfq $rfq, SupplierQuote $quote, User $user): void
    {
        $pr = $rfq->purchaseRequest;

        foreach ($quote->items as $quoteItem) {
            $rfqItem = $quoteItem->rfqItem;
            if (!$rfqItem?->boq_item_id) {
                continue;
            }
            $prItem = $rfqItem->prItem;
            $packageId = $prItem?->package_id ?? $pr?->package_id;
            if (!$packageId) {
                continue;
            }
            $amount = (float) $quoteItem->total_price;
            if ($amount <= 0) {
                continue;
            }
            $qty = config('boq.qty_tracking_enabled', false) ? (float) ($quoteItem->qty ?? 0) : null;
            $this->addConsumption(
                $packageId,
                $rfqItem->boq_item_id,
                $amount,
                $qty,
                'rfq_awarded',
                $rfq->id,
                $user
            );
        }
    }

    /**
     * Add consumption to package_boq_items. Enforces budget protection.
     *
     * @throws \App\Exceptions\BudgetExceededException when over budget and no approved MarginException
     */
    public function addConsumption(
        string $projectPackageId,
        string $boqItemId,
        float $amount,
        ?float $qty,
        string $triggerContext,
        string $sourceId,
        User $user
    ): void {
        $pbi = PackageBoqItem::where('project_package_id', $projectPackageId)
            ->where('boq_item_id', $boqItemId)
            ->lockForUpdate()
            ->firstOrFail();

        $newConsumedCost = (float) $pbi->consumed_cost + $amount;
        $allocated = (float) $pbi->allocated_budget_cost;

        if ($newConsumedCost > $allocated) {
            $hasException = MarginException::where('scope_type', 'boq_item')
                ->where('scope_id', $pbi->id)
                ->where('status', 'approved')
                ->exists();
            if (!$hasException) {
                throw new \App\Exceptions\BudgetExceededException(
                    "Budget exceeded for BOQ item {$boqItemId} in package {$projectPackageId}. " .
                    "Allocated: {$allocated}, would consume: {$newConsumedCost}. MarginException required."
                );
            }
        }

        if (config('boq.qty_tracking_enabled', false) && $qty !== null && $pbi->qty_allocated !== null) {
            $newConsumedQty = (float) ($pbi->consumed_qty ?? 0) + $qty;
            if ($newConsumedQty > (float) $pbi->qty_allocated) {
                throw new \App\Exceptions\QuantityExceededException(
                    "Quantity exceeded for BOQ item {$boqItemId} in package {$projectPackageId}. " .
                    "Allocated: {$pbi->qty_allocated}, would consume: {$newConsumedQty}."
                );
            }
        }

        $oldConsumed = (float) $pbi->consumed_cost;
        $pbi->consumed_cost = $newConsumedCost;
        if (config('boq.qty_tracking_enabled', false) && $qty !== null) {
            $pbi->consumed_qty = (float) ($pbi->consumed_qty ?? 0) + $qty;
        }
        $pbi->save();

        DB::afterCommit(function () use ($pbi, $oldConsumed, $amount, $triggerContext, $sourceId, $user) {
            $this->activityLogger->log(
                'boq.budget_consumed',
                $pbi,
                ['consumed_cost' => $oldConsumed],
                [
                    'consumed_cost'   => (float) $pbi->consumed_cost,
                    'amount_added'    => $amount,
                    'trigger_context' => $triggerContext,
                    'source_id'       => $sourceId,
                ],
                $user
            );
        });
    }

    /**
     * Add consumed cost from Contract creation.
     * Stub for future implementation when contracts table exists.
     * Call within transaction; activity log runs after commit.
     */
    public function addConsumptionFromContract(string $projectPackageId, string $boqItemId, float $amount, string $contractId, User $user): void
    {
        $this->addConsumption(
            $projectPackageId,
            $boqItemId,
            $amount,
            null,
            'contract_created',
            $contractId,
            $user
        );
    }
}
