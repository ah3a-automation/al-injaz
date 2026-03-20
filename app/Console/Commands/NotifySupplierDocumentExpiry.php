<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\SupplierDocument;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\System\NotificationService;
use App\Services\Notifications\NotificationEngineBridge;
use App\Services\Notifications\NotificationEventContext;
use Carbon\Carbon;
use Illuminate\Console\Command;

final class NotifySupplierDocumentExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'suppliers:notify-document-expiry';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Notify suppliers and procurement team about expiring or expired supplier documents.';

    public function handle(
        NotificationService $notificationService,
        NotificationEngineBridge $notificationEngineBridge
    ): void
    {
        $warningDays = (int) SystemSetting::get('supplier_document_expiry_warning_days', 30);
        $today = Carbon::today();
        $warnDate = $today->copy()->addDays($warningDays);

        $documents = SupplierDocument::with(['supplier', 'supplier.supplierUser'])
            ->whereNotNull('expiry_date')
            ->whereNull('deleted_at')
            ->where(function ($q) use ($today, $warnDate): void {
                $q->whereBetween('expiry_date', [$today->toDateString(), $warnDate->toDateString()])
                    ->orWhereDate('expiry_date', '<', $today->toDateString());
            })
            ->where(function ($q) use ($today): void {
                $q->whereNull('last_expiry_notified_at')
                    ->orWhereDate('last_expiry_notified_at', '<', $today->toDateString());
            })
            ->get();

        $procurementUsers = User::permission('suppliers.approve')->get();

        $notifyInapp = SystemSetting::get('supplier_document_expiry_notify_inapp', '1') === '1';
        $notifyEmail = SystemSetting::get('supplier_document_expiry_notify_email', '1') === '1';

        foreach ($documents as $document) {
            $supplier = $document->supplier;
            if (! $supplier) {
                continue;
            }

            $daysLeft = (int) $today->diffInDays($document->expiry_date, false);
            $isExpired = $daysLeft < 0;
            $docLabel = $document->document_type;

            $eventKeyBase = $isExpired ? 'supplier.document_expired' : 'supplier.document_expiring_soon';
            $title = $isExpired
                ? "Document expired: {$docLabel}"
                : "Document expiring soon: {$docLabel}";

            $message = $isExpired
                ? "The document '{$docLabel}' for supplier '{$supplier->legal_name_en}' has expired."
                : "The document '{$docLabel}' for supplier '{$supplier->legal_name_en}' expires in {$daysLeft} days.";

            $metadata = [
                'supplier_id' => $supplier->id,
                'document_type' => $docLabel,
                'expiry_date' => $document->expiry_date?->toDateString(),
                'days_left' => $daysLeft,
            ];

            // Phase 2.6: gateway for whether we should send email copies for these events.
            // Internal/in-app delivery is controlled by notification_settings send_internal.
            $metadata['email_delivery_enabled'] = $notifyEmail;

            if ($notifyInapp) {
                if ($supplier->supplierUser) {
                    $notificationEngineBridge->dispatchOrLegacy(
                        $eventKeyBase,
                        new NotificationEventContext([
                            'title' => $title,
                            'message' => $message,
                            'link' => route('supplier.profile'),
                            'metadata' => $metadata,
                            'supplier_user_ids' => [$supplier->supplierUser->id],
                        ]),
                        legacyDispatch: function () use ($notificationService, $supplier, $eventKeyBase, $title, $message, $metadata): void {
                            $notificationService->notifyUser(
                                $supplier->supplierUser,
                                $eventKeyBase,
                                $title,
                                $message,
                                route('supplier.profile'),
                                $metadata
                            );
                        }
                    );
                }

                $internalEventKey = $eventKeyBase . '.internal';

                if ($procurementUsers->isNotEmpty()) {
                    $notificationEngineBridge->dispatchOrLegacy(
                        $internalEventKey,
                        new NotificationEventContext([
                            'title' => $title,
                            'message' => $message,
                            'link' => route('suppliers.show', $supplier->id),
                            'metadata' => $metadata,
                        ]),
                        legacyDispatch: function () use ($notificationService, $procurementUsers, $internalEventKey, $title, $message, $supplier, $metadata): void {
                            $notificationService->notifyUsers(
                                $procurementUsers,
                                $internalEventKey,
                                $title,
                                $message,
                                route('suppliers.show', $supplier->id),
                                $metadata
                            );
                        }
                    );
                }
            }

            // NOTE: Email delivery for these events is currently handled via the
            // existing notification pipeline and mail configuration, not directly
            // in this command. The supplier_document_expiry_notify_email setting
            // is persisted and can be used by downstream mail workers to decide
            // whether to send email copies for these SystemNotification records.
            // For now, we do not send additional direct mails here to avoid
            // diverging from the centralized notification architecture.

            $document->update(['last_expiry_notified_at' => now()]);
        }

        $this->info(sprintf('Processed %d supplier document(s) for expiry notifications.', $documents->count()));
    }
}

