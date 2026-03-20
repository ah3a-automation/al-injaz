<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Models\User;
use App\Models\SystemNotification;
use App\Services\Notifications\NotificationDispatchChannelPlan;
use App\Services\Notifications\NotificationEventContext;
use App\Services\System\NotificationService;

final class SendInternalNotificationAction
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @param NotificationDispatchChannelPlan $plan
     */
    public function execute(
        string $emittedEventKey,
        NotificationDispatchChannelPlan $plan,
        NotificationEventContext $context
    ): int
    {
        $recipientUserIds = [];
        foreach ($plan->recipients as $recipient) {
            if ($recipient->userId !== null) {
                $recipientUserIds[] = $recipient->userId;
            }
        }

        $recipientUserIds = array_values(array_unique($recipientUserIds));
        if ($recipientUserIds === []) {
            return 0;
        }

        /** @var array<int, User> $usersById */
        $usersById = User::query()
            ->whereIn('id', $recipientUserIds)
            ->get(['id'])
            ->keyBy('id')
            ->all();

        $title = $context->getTitle() ?? $emittedEventKey;
        $message = $context->getMessage() ?? '';
        $link = $context->getLink() ?? '';
        $metadata = $context->getMetadata();

        // Idempotency for outbox-driven replays and legacy overlap:
        // If a SystemNotification already exists for the same user + event_key
        // and matches the metadata identifiers we can safely compare, skip creation.
        //
        // This keeps outbox dispatch reversible without risking duplicates.
        $dedupeCandidates = [
            'rfq_id',
            'supplier_id',
            'clarification_id',
            'contract_id',
            'invoice_id',
            'project_id',
            'task_id',
        ];

        $dedupeKeys = array_values(array_intersect(array_keys($metadata), $dedupeCandidates));
        $existingMetaByUserId = [];

        if ($dedupeKeys !== []) {
            foreach ($plan->recipients as $recipient) {
                if ($recipient->userId === null) {
                    continue;
                }

                $uid = $recipient->userId;
                if (isset($existingMetaByUserId[$uid])) {
                    continue;
                }

                $existingMetaByUserId[$uid] = SystemNotification::query()
                    ->where('user_id', $uid)
                    ->where('event_key', $emittedEventKey)
                    ->get(['metadata'])
                    ->map(static function (SystemNotification $sn): array {
                        return is_array($sn->metadata) ? $sn->metadata : [];
                    })
                    ->all();
            }
        }

        $created = 0;
        foreach ($plan->recipients as $recipient) {
            if ($recipient->userId === null) {
                continue;
            }

            $user = $usersById[$recipient->userId] ?? null;
            if ($user === null) {
                continue;
            }

            if ($dedupeKeys !== []) {
                $uid = $user->id;
                $alreadyHas = false;
                $existingMetas = $existingMetaByUserId[$uid] ?? [];

                foreach ($existingMetas as $existingMeta) {
                    $matches = true;
                    foreach ($dedupeKeys as $k) {
                        if (! array_key_exists($k, $existingMeta) || $existingMeta[$k] !== $metadata[$k]) {
                            $matches = false;
                            break;
                        }
                    }

                    if ($matches) {
                        $alreadyHas = true;
                        break;
                    }
                }

                if ($alreadyHas) {
                    continue;
                }
            }

            $this->notificationService->notifyUser(
                $user,
                $emittedEventKey,
                $title,
                $message,
                $link,
                $metadata
            );

            $created++;
        }

        return $created;
    }
}

