<?php

declare(strict_types=1);

namespace App\Services\Procurement;

use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\RfqSupplierQuote;
use App\Services\System\NotificationService;
use App\Services\System\OutboxService;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEventContext;
use App\Services\Notifications\NotificationOutboxEventKeyMapper;
use Illuminate\Support\Collection;

final class RfqEventService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly OutboxService $outboxService,
        private readonly NotificationEngineBridge $notificationEngineBridge
    ) {}

    public function rfqIssued(Rfq $rfq): void
    {
        $baseMeta = ['rfq_id' => $rfq->id];
        $linkInternal = '/rfqs/' . $rfq->id;
        $linkSupplier = '/supplier/rfqs/' . $rfq->id;

        $owner = $rfq->createdBy;
        if ($owner) {
            $eventKey = 'rfq.issued';
            $title = 'RFQ issued';
            $message = "RFQ {$rfq->rfq_number} has been issued.";

            $this->notificationEngineBridge->dispatchOrLegacy(
                $eventKey,
                new NotificationEventContext([
                    'title' => $title,
                    'message' => $message,
                    'link' => $linkInternal,
                    'metadata' => $baseMeta,
                    'created_by_user_id' => $owner->id,
                    'actor_id' => $owner->id,
                ]),
                legacyDispatch: function () use ($owner, $eventKey, $title, $message, $linkInternal, $baseMeta): void {
                    $this->notificationService->notifyUser(
                        $owner,
                        $eventKey,
                        $title,
                        $message,
                        $linkInternal,
                        $baseMeta
                    );
                }
            );
        }

        $supplierUsers = $this->invitedSupplierUsers($rfq);

        $eventKeySupplier = 'rfq.issued.supplier';
        $titleSupplier = __('rfqs.notification_supplier_rfq_invited_title');
        $messageSupplier = __('rfqs.notification_supplier_rfq_invited_message', [
            'number' => $rfq->rfq_number,
            'title' => $rfq->title,
        ]);

        $this->notificationEngineBridge->dispatchOrLegacy(
            $eventKeySupplier,
            new NotificationEventContext([
                'title' => $titleSupplier,
                'message' => $messageSupplier,
                'link' => $linkSupplier,
                'metadata' => $baseMeta,
                'supplier_user_ids' => $supplierUsers->pluck('id')->toArray(),
            ]),
            legacyDispatch: function () use ($supplierUsers, $eventKeySupplier, $titleSupplier, $messageSupplier, $linkSupplier, $baseMeta): void {
                $this->notificationService->notifyUsers(
                    $supplierUsers,
                    $eventKeySupplier,
                    $titleSupplier,
                    $messageSupplier,
                    $linkSupplier,
                    $baseMeta
                );
            }
        );

        $this->outboxService->record('rfq.issued', 'rfq', $rfq->id, $baseMeta);
    }

    public function clarificationAdded(RfqClarification $clarification): void
    {
        $rfq = $clarification->rfq;
        $meta = ['rfq_id' => $rfq->id, 'clarification_id' => $clarification->id];
        if ($clarification->supplier_id) {
            $meta['supplier_id'] = $clarification->supplier_id;
        }
        $linkInternal = '/rfqs/' . $rfq->id;

        $owner = $rfq->createdBy;
        if ($owner) {
            $eventKeyInternal = 'clarification.added';
            $titleInternal = 'New clarification';
            $messageInternal = 'A clarification question was submitted for RFQ ' . $rfq->rfq_number . '.';

            $this->notificationEngineBridge->dispatchOrLegacy(
                $eventKeyInternal,
                new NotificationEventContext([
                    'title' => $titleInternal,
                    'message' => $messageInternal,
                    'link' => $linkInternal,
                    'metadata' => $meta,
                    'created_by_user_id' => $owner->id,
                    'actor_id' => $owner->id,
                ]),
                legacyDispatch: function () use ($owner, $eventKeyInternal, $titleInternal, $messageInternal, $linkInternal, $meta): void {
                    $this->notificationService->notifyUser(
                        $owner,
                        $eventKeyInternal,
                        $titleInternal,
                        $messageInternal,
                        $linkInternal,
                        $meta
                    );
                }
            );
        }

        if ($clarification->supplier) {
            $supplierUser = $clarification->supplier->supplierUser;
            if ($supplierUser) {
                $eventKey = 'clarification.added.supplier';
                $titleSupplier = __('rfqs.notification_supplier_clarification_submitted_title');
                $messageSupplier = __('rfqs.notification_supplier_clarification_submitted_message', [
                    'number' => $rfq->rfq_number,
                ]);
                $linkSupplier = '/supplier/rfqs/' . $rfq->id;

                $this->notificationEngineBridge->dispatchOrLegacy(
                    $eventKey,
                    new NotificationEventContext([
                        'title' => $titleSupplier,
                        'message' => $messageSupplier,
                        'link' => $linkSupplier,
                        'metadata' => $meta,
                        'supplier_user_ids' => [$supplierUser->id],
                    ]),
                    legacyDispatch: function () use ($supplierUser, $eventKey, $titleSupplier, $messageSupplier, $linkSupplier, $meta): void {
                        $this->notificationService->notifyUser(
                            $supplierUser,
                            $eventKey,
                            $titleSupplier,
                            $messageSupplier,
                            $linkSupplier,
                            $meta
                        );
                    }
                );
            }
        }

        $this->outboxService->record('rfq.clarification_added', 'rfq_clarification', $clarification->id, $meta);
    }

    public function clarificationAnswered(RfqClarification $clarification): void
    {
        $rfq = $clarification->rfq;
        $meta = ['rfq_id' => $rfq->id, 'clarification_id' => $clarification->id];
        if ($clarification->supplier_id) {
            $meta['supplier_id'] = $clarification->supplier_id;
        }

        if ($clarification->supplier) {
            $supplierUser = $clarification->supplier->supplierUser;
            if ($supplierUser) {
                $eventKey = 'clarification.answered';
                $titleSupplier = 'Clarification answered';
                $messageSupplier = 'A clarification for RFQ ' . $rfq->rfq_number . ' has been answered.';
                $linkSupplier = '/supplier/rfqs/' . $rfq->id;

                $this->notificationEngineBridge->dispatchOrLegacy(
                    $eventKey,
                    new NotificationEventContext([
                        'title' => $titleSupplier,
                        'message' => $messageSupplier,
                        'link' => $linkSupplier,
                        'metadata' => $meta,
                        'supplier_user_ids' => [$supplierUser->id],
                    ]),
                    legacyDispatch: function () use ($supplierUser, $eventKey, $titleSupplier, $messageSupplier, $linkSupplier, $meta): void {
                        $this->notificationService->notifyUser(
                            $supplierUser,
                            $eventKey,
                            $titleSupplier,
                            $messageSupplier,
                            $linkSupplier,
                            $meta
                        );
                    }
                );
            }
        }

        $this->outboxService->record('rfq.clarification_answered', 'rfq_clarification', $clarification->id, $meta);
    }

    /**
     * Broadcast when a clarification that was previously private is made public/general.
     * Notifies all invited suppliers that a clarification is now visible to them.
     */
    public function clarificationMadePublic(RfqClarification $clarification): void
    {
        $rfq = $clarification->rfq;
        $meta = ['rfq_id' => $rfq->id, 'clarification_id' => $clarification->id];
        $eventKey = 'clarification.made_public';
        $title = __('rfqs.notification_supplier_clarification_public_title');
        $message = __('rfqs.notification_supplier_clarification_public_message', [
            'number' => $rfq->rfq_number,
        ]);
        $link = '/supplier/rfqs/' . $rfq->id;

        // All invited suppliers on this RFQ
        $supplierUsers = $rfq->suppliers()
            ->with('supplier.supplierUser')
            ->get()
            ->pluck('supplier.supplierUser')
            ->filter(); // remove nulls

        $supplierUserIds = [];
        if ($supplierUsers->isNotEmpty()) {
            $supplierUserIds = $supplierUsers->pluck('id')->toArray();
            $meta['supplier_user_ids'] = $supplierUserIds;
            $this->notificationEngineBridge->dispatchOrLegacy(
                $eventKey,
                new NotificationEventContext([
                    'title' => $title,
                    'message' => $message,
                    'link' => $link,
                    'metadata' => $meta,
                    'supplier_user_ids' => $supplierUserIds,
                ]),
                legacyDispatch: function () use ($supplierUsers, $eventKey, $title, $message, $link, $meta): void {
                    $this->notificationService->notifyUsers(
                        $supplierUsers,
                        $eventKey,
                        $title,
                        $message,
                        $link,
                        $meta
                    );
                }
            );
        }

        $outboxPayload = [
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'metadata' => $meta,
            'supplier_user_ids' => $supplierUserIds,
            NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => $eventKey,
        ];

        $this->outboxService->record('rfq.clarification_public', 'rfq_clarification', $clarification->id, $outboxPayload);
    }

    public function quoteSubmitted(RfqSupplierQuote $quote): void
    {
        $rfq = $quote->rfq;
        $meta = ['rfq_id' => $rfq->id, 'supplier_id' => $quote->supplier_id];
        $linkInternal = '/rfqs/' . $rfq->id;

        $owner = $rfq->createdBy;
        $createdByUserId = null;
        $actorId = null;
        if ($owner) {
            $meta['created_by_user_id'] = $owner->id;
            $meta['actor_id'] = $owner->id;
            $createdByUserId = $owner->id;
            $actorId = $owner->id;

            $eventKey = $quote->status === RfqSupplierQuote::STATUS_REVISED ? 'quote.revised' : 'quote.submitted';
            $title = $quote->status === RfqSupplierQuote::STATUS_REVISED ? 'Quote revised' : 'Quote submitted';
            $message = $quote->status === RfqSupplierQuote::STATUS_REVISED
                ? "A quote was revised for RFQ {$rfq->rfq_number}."
                : "A quote was submitted for RFQ {$rfq->rfq_number}.";

            $this->notificationEngineBridge->dispatchOrLegacy(
                $eventKey,
                new NotificationEventContext([
                    'title' => $title,
                    'message' => $message,
                    'link' => $linkInternal,
                    'metadata' => $meta,
                    'created_by_user_id' => $owner->id,
                    'actor_id' => $owner->id,
                ]),
                legacyDispatch: function () use ($owner, $eventKey, $title, $message, $linkInternal, $meta): void {
                    $this->notificationService->notifyUser(
                        $owner,
                        $eventKey,
                        $title,
                        $message,
                        $linkInternal,
                        $meta
                    );
                }
            );
        }

        $resolvedEventKey = $quote->status === RfqSupplierQuote::STATUS_REVISED ? 'quote.revised' : 'quote.submitted';
        $outboxPayload = [
            // Content for engine-driven internal notifications
            'title' => $resolvedEventKey === 'quote.revised' ? 'Quote revised' : 'Quote submitted',
            'message' => $resolvedEventKey === 'quote.revised'
                ? "A quote was revised for RFQ {$rfq->rfq_number}."
                : "A quote was submitted for RFQ {$rfq->rfq_number}.",
            'link' => $linkInternal,
            'metadata' => $meta,

            // Recipient resolution for creator
            'created_by_user_id' => $createdByUserId,
            'actor_id' => $actorId,

            // Centralized outbox -> notification-policy mapping
            NotificationOutboxEventKeyMapper::META_QUOTE_EVENT_KEY => $resolvedEventKey,
            NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => $resolvedEventKey,
        ];

        $this->outboxService->record('rfq.quote_submitted', 'rfq_supplier_quote', $quote->id, $outboxPayload);
    }

    public function rfqMovedToEvaluation(Rfq $rfq): void
    {
        $meta = ['rfq_id' => $rfq->id];
        $linkInternal = '/rfqs/' . $rfq->id;

        $owner = $rfq->createdBy;
        $createdByUserId = null;
        $actorId = null;
        if ($owner) {
            $meta['created_by_user_id'] = $owner->id;
            $meta['actor_id'] = $owner->id;
            $createdByUserId = $owner->id;
            $actorId = $owner->id;

            $eventKey = 'rfq.evaluation';
            $title = 'RFQ moved to evaluation';
            $message = "RFQ {$rfq->rfq_number} has been moved to evaluation.";

            $this->notificationEngineBridge->dispatchOrLegacy(
                $eventKey,
                new NotificationEventContext([
                    'title' => $title,
                    'message' => $message,
                    'link' => $linkInternal,
                    'metadata' => $meta,
                    'created_by_user_id' => $owner->id,
                    'actor_id' => $owner->id,
                ]),
                legacyDispatch: function () use ($owner, $eventKey, $title, $message, $linkInternal, $meta): void {
                    $this->notificationService->notifyUser(
                        $owner,
                        $eventKey,
                        $title,
                        $message,
                        $linkInternal,
                        $meta
                    );
                }
            );
        }

        $outboxPayload = [
            'title' => 'RFQ moved to evaluation',
            'message' => "RFQ {$rfq->rfq_number} has been moved to evaluation.",
            'link' => $linkInternal,
            'metadata' => $meta,
            'created_by_user_id' => $createdByUserId,
            'actor_id' => $actorId,
            NotificationOutboxEventKeyMapper::META_NOTIFICATION_EVENT_KEY => 'rfq.evaluation',
        ];

        $this->outboxService->record('rfq.evaluation', 'rfq', $rfq->id, $outboxPayload);
    }

    public function rfqAwarded(Rfq $rfq): void
    {
        $award = $rfq->award;
        $meta = ['rfq_id' => $rfq->id];
        if ($award && $award->supplier_id) {
            $meta['supplier_id'] = $award->supplier_id;
        }

        $winner = $award?->supplier;
        if ($winner) {
            $supplierUser = $winner->supplierUser;
            if ($supplierUser) {
                $eventKey = 'rfq.awarded';
                $titleSupplier = __('rfqs.notification_supplier_rfq_awarded_title');
                $messageSupplier = __('rfqs.notification_supplier_rfq_awarded_message', [
                    'number' => $rfq->rfq_number,
                ]);
                $linkSupplier = '/supplier/rfqs/' . $rfq->id;

                $this->notificationEngineBridge->dispatchOrLegacy(
                    $eventKey,
                    new NotificationEventContext([
                        'title' => $titleSupplier,
                        'message' => $messageSupplier,
                        'link' => $linkSupplier,
                        'metadata' => $meta,
                        'supplier_user_ids' => [$supplierUser->id],
                    ]),
                    legacyDispatch: function () use ($supplierUser, $eventKey, $titleSupplier, $messageSupplier, $linkSupplier, $meta): void {
                        $this->notificationService->notifyUser(
                            $supplierUser,
                            $eventKey,
                            $titleSupplier,
                            $messageSupplier,
                            $linkSupplier,
                            $meta
                        );
                    }
                );
            }
        }

        $this->outboxService->record('rfq.awarded', 'rfq', $rfq->id, $meta);
    }

    /**
     * @return Collection<int, \App\Models\User>
     */
    private function invitedSupplierUsers(Rfq $rfq): Collection
    {
        $rfq->load(['suppliers.supplier.supplierUser']);
        return $rfq->suppliers
            ->map(fn ($rs) => $rs->supplier?->supplierUser)
            ->filter()
            ->unique('id')
            ->values();
    }
}
