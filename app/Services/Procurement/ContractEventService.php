<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Contract;
use App\Services\System\NotificationService;
use App\Services\System\OutboxService;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEventContext;
use Illuminate\Support\Collection;

final class ContractEventService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly OutboxService $outboxService,
        private readonly NotificationEngineBridge $notificationEngineBridge
    ) {}

    public function contractActivated(Contract $contract): void
    {
        $contract->load(['rfq.createdBy', 'supplier']);
        $meta = ['contract_id' => $contract->id, 'rfq_id' => $contract->rfq_id];
        $link = '/contracts/' . $contract->id;
        $title = 'Contract activated';
        $message = "Contract {$contract->contract_number} has been activated.";

        $recipients = collect();
        $owner = $contract->rfq?->createdBy;
        if ($owner) {
            $recipients->push($owner);
        }
        $supplierUser = $contract->supplier?->supplierUser;
        if ($supplierUser) {
            $recipients->push($supplierUser);
        }
        $recipients = $recipients->unique('id')->values();

        $eventKey = 'contract.activated';

        $createdByUserId = $owner?->id;
        $supplierUserIds = $supplierUser ? [$supplierUser->id] : [];

        $this->notificationEngineBridge->dispatchOrLegacy(
            $eventKey,
            new NotificationEventContext([
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'metadata' => $meta,
                'created_by_user_id' => $createdByUserId,
                'supplier_user_ids' => $supplierUserIds,
            ]),
            legacyDispatch: function () use ($recipients, $eventKey, $title, $message, $link, $meta): void {
                $this->notificationService->notifyUsers(
                    $recipients,
                    $eventKey,
                    $title,
                    $message,
                    $link,
                    $meta
                );
            }
        );

        $this->outboxService->record('contract.activated', 'contract', $contract->id, $meta);
    }
}
