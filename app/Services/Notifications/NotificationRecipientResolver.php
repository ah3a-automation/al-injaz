<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\NotificationRecipient;
use App\Models\Supplier;
use App\Models\TaskAssignee;
use App\Models\User;

final class NotificationRecipientResolver
{
    /**
     * @return array<int, ResolvedRecipientData>
     */
    public function resolve(ResolvedNotificationPolicyData $policy, NotificationEventContext $context): array
    {
        $recipientRows = NotificationRecipient::query()
            ->where('notification_setting_id', $policy->notificationSettingId)
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->get();

        $resolvedByDedupeKey = [];

        foreach ($recipientRows as $row) {
            $recipientType = (string) $row->recipient_type;
            $channelOverride = $row->channel_override !== null ? (string) $row->channel_override : null;

            $resolved = $this->resolveRow($row, $recipientType, $context);
            foreach ($resolved as $recipientData) {
                $recipientData = new ResolvedRecipientData(
                    recipientType: $recipientData->recipientType,
                    userId: $recipientData->userId,
                    email: $recipientData->email,
                    channelOverride: $channelOverride ?? $recipientData->channelOverride,
                    resolverMetadata: $recipientData->resolverMetadata,
                );

                $key = $recipientData->dedupeKey();
                if (! isset($resolvedByDedupeKey[$key])) {
                    $resolvedByDedupeKey[$key] = $recipientData;
                    continue;
                }

                // If one version has an explicit override and the other doesn't, prefer the override.
                if ($resolvedByDedupeKey[$key]->channelOverride === null && $recipientData->channelOverride !== null) {
                    $resolvedByDedupeKey[$key] = $recipientData;
                }
            }
        }

        return array_values($resolvedByDedupeKey);
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveRow(NotificationRecipient $row, string $recipientType, NotificationEventContext $context): array
    {
        return match ($recipientType) {
            'user' => $this->resolveUserRecipient($row, $context),
            'role' => $this->resolveRoleRecipient($row, $context),
            'approver' => $this->resolveApproverRecipient($row, $context),
            'supplier_user' => $this->resolveSupplierUserRecipient($row, $context),
            'actor' => $this->resolveActorRecipient($row, $context),
            'creator' => $this->resolveCreatorRecipient($row, $context),
            // `record_creator` is the canonical dynamic recipient for "who created the record".
            'record_creator' => $this->resolveRecordCreatorRecipient($row, $context),
            'assigned_user' => $this->resolveAssignedUserRecipient($row, $context),
            'explicit_email' => $this->resolveExplicitEmailRecipient($row, $context),
            default => $this->failUnsupportedRecipientType($recipientType, $row->id),
        };
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function failUnsupportedRecipientType(string $recipientType, mixed $rowId): array
    {
        logger()->debug('NotificationRecipientResolver: unsupported recipient_type, skipping', [
            'recipient_type' => $recipientType,
            'recipient_row_id' => $rowId,
        ]);

        return [];
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveUserRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $userId = $row->user_id !== null ? (int) $row->user_id : null;
        if ($userId === null && is_string($row->recipient_value)) {
            $maybe = trim($row->recipient_value);
            if ($maybe !== '' && is_numeric($maybe)) {
                $userId = (int) $maybe;
            }
        }

        if ($userId === null) {
            return [];
        }

        $user = User::query()->select(['id', 'email'])->find($userId);
        if ($user === null) {
            return [];
        }

        return [
            new ResolvedRecipientData(
                recipientType: 'user',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: [],
            ),
        ];
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveRoleRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $roleName = $row->role_name;
        if (! is_string($roleName) || $roleName === '') {
            return [];
        }

        // Spatie role resolution.
        $users = User::role($roleName)->get(['id', 'email']);
        if ($users->isEmpty()) {
            return [];
        }

        $out = [];
        foreach ($users as $user) {
            $out[] = new ResolvedRecipientData(
                recipientType: 'role',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['role_name' => $roleName],
            );
        }

        return $out;
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveApproverRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        // In v1, "approver" uses `role_name` as a Spatie *permission* name (e.g. `suppliers.approve`).
        // We resolve users that have the permission.
        $permissionName = $row->role_name;
        if (! is_string($permissionName) || $permissionName === '') {
            return [];
        }

        // Spatie permission scope.
        $users = User::permission($permissionName)->get(['id', 'email']);
        if ($users->isEmpty()) {
            return [];
        }

        $out = [];
        foreach ($users as $user) {
            $out[] = new ResolvedRecipientData(
                recipientType: 'approver',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['permission' => $permissionName],
            );
        }

        return $out;
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveAssignedUserRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $contextArr = $context->toArray();

        /** @var array<int, int> $assignedUserIds */
        $assignedUserIds = [];

        // Phase 5.5: runtime context keys first (preferred for task flows).
        $v = $contextArr['assigned_user_ids'] ?? null;
        if (is_array($v)) {
            foreach ($v as $id) {
                if (is_int($id)) {
                    $assignedUserIds[] = $id;
                    continue;
                }

                if (is_string($id) && is_numeric($id)) {
                    $assignedUserIds[] = (int) $id;
                }
            }
        } else {
            $single = $contextArr['assigned_user_id'] ?? null;
            if (is_int($single)) {
                $assignedUserIds[] = $single;
            } elseif (is_string($single) && is_numeric($single)) {
                $assignedUserIds[] = (int) $single;
            }
        }

        // Safe fallback domain lookup:
        // If we have task_id but not assigned_user_ids, derive from task_assignees.
        if ($assignedUserIds === []) {
            $taskId = $contextArr['task_id'] ?? null;
            if (is_string($taskId) && $taskId !== '') {
                $assignedUserIds = TaskAssignee::query()
                    ->where('task_id', $taskId)
                    ->pluck('user_id')
                    ->filter()
                    ->map(static fn ($id) => is_numeric((string) $id) ? (int) $id : null)
                    ->filter()
                    ->values()
                    ->all();
            }
        }

        $assignedUserIds = array_values(array_unique($assignedUserIds));
        if ($assignedUserIds === []) {
            return [];
        }

        $users = User::query()
            ->whereIn('id', $assignedUserIds)
            ->get(['id', 'email'])
            ->keyBy('id')
            ->all();

        $out = [];
        foreach ($assignedUserIds as $id) {
            $user = $users[$id] ?? null;
            if ($user === null) {
                continue;
            }

            $out[] = new ResolvedRecipientData(
                recipientType: 'assigned_user',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['assigned_user_id' => $id],
            );
        }

        return $out;
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveSupplierUserRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $contextArr = $context->toArray();

        /** @var array<int, int> $supplierUserIds */
        $supplierUserIds = [];

        $v = $contextArr['supplier_user_ids'] ?? null;
        if (is_array($v)) {
            foreach ($v as $id) {
                if (is_int($id)) {
                    $supplierUserIds[] = $id;
                    continue;
                }

                if (is_string($id) && is_numeric($id)) {
                    $supplierUserIds[] = (int) $id;
                }
            }
        } else {
            $single = $contextArr['supplier_user_id'] ?? null;
            if (is_int($single)) {
                $supplierUserIds[] = $single;
            } elseif (is_string($single) && is_numeric($single)) {
                $supplierUserIds[] = (int) $single;
            }
        }

        if ($supplierUserIds === []) {
            // Fallback: resolve from supplier_id -> supplier_user_id
            $supplierId = $contextArr['supplier_id'] ?? null;
            if (is_string($supplierId) || is_int($supplierId)) {
                $supplier = Supplier::query()->select(['id', 'supplier_user_id'])->find((string) $supplierId);
                $supplierUserId = $supplier?->supplier_user_id;
                if (is_string($supplierUserId) && is_numeric($supplierUserId)) {
                    $supplierUserIds[] = (int) $supplierUserId;
                }
            }
        }

        $supplierUserIds = array_values(array_unique($supplierUserIds));
        if ($supplierUserIds === []) {
            return [];
        }

        $users = User::query()
            ->whereIn('id', $supplierUserIds)
            ->get(['id', 'email'])
            ->keyBy('id')
            ->all();

        $out = [];
        foreach ($supplierUserIds as $id) {
            $user = $users[$id] ?? null;
            if ($user === null) {
                continue;
            }

            $out[] = new ResolvedRecipientData(
                recipientType: 'supplier_user',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['supplier_user_id' => $id],
            );
        }

        return $out;
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveActorRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $actorId = $context->toArray()['actor_id'] ?? null;
        if (! is_numeric($actorId)) {
            $actor = $context->toArray()['actor'] ?? null;
            $actorId = is_array($actor) ? ($actor['id'] ?? null) : null;
        }

        if (! is_numeric($actorId)) {
            return [];
        }

        $user = User::query()->select(['id', 'email'])->find((int) $actorId);
        if ($user === null) {
            return [];
        }

        return [
            new ResolvedRecipientData(
                recipientType: 'actor',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['actor_id' => (int) $actorId],
            ),
        ];
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveRecordCreatorRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $creatorId = $context->toArray()['record_creator_user_id'] ?? null;
        if (! is_numeric($creatorId)) {
            $creatorId = $context->toArray()['created_by_user_id'] ?? null;
        }

        if (! is_numeric($creatorId)) {
            return [];
        }

        $user = User::query()->select(['id', 'email'])->find((int) $creatorId);
        if ($user === null) {
            return [];
        }

        return [
            new ResolvedRecipientData(
                recipientType: 'record_creator',
                userId: $user->id,
                email: $user->email,
                channelOverride: null,
                resolverMetadata: ['record_creator_user_id' => (int) $creatorId],
            ),
        ];
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveCreatorRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        // In v1, "creator" maps to the same context keys as "record_creator".
        return $this->resolveRecordCreatorRecipient($row, $context);
    }

    /**
     * @return array<int, ResolvedRecipientData>
     */
    private function resolveExplicitEmailRecipient(NotificationRecipient $row, NotificationEventContext $context): array
    {
        $email = null;
        if (is_string($row->recipient_value)) {
            $email = trim($row->recipient_value);
        } elseif (is_array($row->resolver_config_json) && is_string($row->resolver_config_json['email'] ?? null)) {
            $email = trim((string) $row->resolver_config_json['email']);
        }

        if (! is_string($email) || $email === '') {
            return [];
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return [];
        }

        return [
            new ResolvedRecipientData(
                recipientType: 'explicit_email',
                userId: null,
                email: $email,
                channelOverride: null,
                resolverMetadata: [],
            ),
        ];
    }
}

