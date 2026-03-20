<?php

declare(strict_types=1);

namespace App\Application\Procurement\Services;

use App\Models\ProcurementPackage;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqItem;
use App\Models\RfqSupplier;
use App\Models\RfqSupplierInvitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateRfqFromPackageService
{
    /**
     * Create an RFQ from a procurement package: persist RFQ first, then items (snapshot of BOQ), then supplier invitations.
     * All operations run in a single database transaction.
     *
     * @param array{title: string, submission_deadline?: string|null, currency: string, supplier_ids: list<string>, on_vendor_list_ids?: list<string>, created_by: int} $data
     */
    public function execute(ProcurementPackage $package, array $data): Rfq
    {
        return DB::transaction(function () use ($package, $data): Rfq {
            $rfqNumber = Rfq::generateRfqNumber();

            $rfq = Rfq::create([
                'project_id'             => $package->project_id,
                'procurement_package_id' => $package->id,
                'title'                  => $data['title'],
                'submission_deadline'    => $data['submission_deadline'] ?? null,
                'currency'               => $data['currency'] ?? $package->currency ?? 'SAR',
                'rfq_number'             => $rfqNumber,
                'status'                 => 'draft',
                'created_by'             => $data['created_by'],
                'require_acceptance'     => true,
            ]);

            $package->load('boqItems');
            $sortOrder = 0;
            foreach ($package->boqItems as $boqItem) {
                $this->createRfqItemSnapshot($rfq, $boqItem, $sortOrder);
                $sortOrder++;
            }

            $onVendorListIds = $data['on_vendor_list_ids'] ?? [];

            foreach ($data['supplier_ids'] as $supplierId) {
                RfqSupplier::create([
                    'rfq_id'         => $rfq->id,
                    'supplier_id'    => $supplierId,
                    'status'         => 'invited',
                    'invited_at'     => now(),
                    'invited_by'     => $data['created_by'],
                    'on_vendor_list' => in_array($supplierId, $onVendorListIds, true),
                ]);

                RfqSupplierInvitation::updateOrCreate(
                    [
                        'rfq_id' => $rfq->id,
                        'supplier_id' => $supplierId,
                    ],
                    [
                        'invited_at' => now(),
                        'status' => RfqSupplierInvitation::STATUS_INVITED,
                    ]
                );
            }

            $rfq->activities()->create([
                'activity_type' => 'rfq_created',
                'description' => 'RFQ created from procurement package.',
                'metadata' => [
                    'rfq_id' => $rfq->id,
                    'package_id' => $package->id,
                    'suppliers_count' => count($data['supplier_ids']),
                ],
                'user_id' => $data['created_by'],
                'actor_type' => User::class,
                'actor_id' => (string) $data['created_by'],
            ]);

            if ($package->status !== ProcurementPackage::STATUS_RFQ_IN_PROGRESS) {
                $previousStatus = $package->status;
                $package->update(['status' => ProcurementPackage::STATUS_RFQ_IN_PROGRESS]);

                $package->activities()->create([
                    'activity_type' => 'rfq_created',
                    'description' => 'RFQ created from package.',
                    'metadata' => [
                        'rfq_id' => $rfq->id,
                        'from_status' => $previousStatus,
                        'to_status' => ProcurementPackage::STATUS_RFQ_IN_PROGRESS,
                    ],
                    'user_id' => $data['created_by'],
                    'actor_type' => User::class,
                    'actor_id' => (string) $data['created_by'],
                ]);
            }

            return $rfq;
        });
    }

    /**
     * Create one RFQ item as a snapshot of BOQ data (no ongoing dependency on BOQ).
     */
    private function createRfqItemSnapshot(Rfq $rfq, ProjectBoqItem $boqItem, int $sortOrder): RfqItem
    {
        return RfqItem::create([
            'rfq_id'         => $rfq->id,
            'boq_item_id'    => $boqItem->id,
            'code'           => $boqItem->code,
            'description_en' => $boqItem->description_en,
            'description_ar' => $boqItem->description_ar,
            'unit'           => $boqItem->unit,
            'qty'            => $boqItem->qty,
            'estimated_cost' => $boqItem->planned_cost ?? 0,
            'sort_order'     => $sortOrder,
        ]);
    }
}
