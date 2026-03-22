<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Contract;
use App\Models\ContractNotice;
use App\Models\User;
use RuntimeException;

final class ContractNoticeService
{
    /**
     * @return array{is_ready: bool, issues: array<int, string>}
     */
    public function checkNoticeEligibility(Contract $contract): array
    {
        $issues = [];
        if ($contract->status !== Contract::STATUS_EXECUTED) {
            $issues[] = __('contracts.execution.eligibility.executed_for_notices');
        }
        if ($contract->administration_status !== Contract::ADMIN_STATUS_INITIALIZED) {
            $issues[] = __('contracts.execution.eligibility.administration_for_notices');
        }
        return ['is_ready' => $issues === [], 'issues' => $issues];
    }

    /**
     * @param array{title: string, description?: string|null, notes?: string|null} $payload
     */
    public function createNotice(Contract $contract, array $payload, User $actor): ContractNotice
    {
        $eligibility = $this->checkNoticeEligibility($contract);
        if (! $eligibility['is_ready']) {
            throw new RuntimeException(implode(' ', $eligibility['issues']));
        }
        $notice = new ContractNotice();
        $notice->contract_id = $contract->id;
        $notice->notice_no = $this->nextNoticeNumber($contract);
        $notice->title = $payload['title'];
        $notice->description = $payload['description'] ?? null;
        $notice->notes = $payload['notes'] ?? null;
        $notice->status = ContractNotice::STATUS_DRAFT;
        $notice->created_by_user_id = $actor->id;
        $notice->updated_by_user_id = $actor->id;
        $notice->save();
        return $notice;
    }

    /**
     * @param array{title?: string, description?: string|null, notes?: string|null} $payload
     */
    public function updateDraftNotice(ContractNotice $notice, array $payload, User $actor): ContractNotice
    {
        if ($notice->status !== ContractNotice::STATUS_DRAFT) {
            throw new RuntimeException('Only draft notices can be updated.');
        }
        if (isset($payload['title'])) {
            $notice->title = $payload['title'];
        }
        if (array_key_exists('description', $payload)) {
            $notice->description = $payload['description'];
        }
        if (array_key_exists('notes', $payload)) {
            $notice->notes = $payload['notes'];
        }
        $notice->updated_by_user_id = $actor->id;
        $notice->save();
        return $notice;
    }

    public function issueNotice(ContractNotice $notice, User $actor): ContractNotice
    {
        if ($notice->status !== ContractNotice::STATUS_DRAFT) {
            throw new RuntimeException('Only draft notices can be issued.');
        }
        $notice->status = ContractNotice::STATUS_ISSUED;
        $notice->issued_at = now();
        $notice->updated_by_user_id = $actor->id;
        $notice->save();
        return $notice;
    }

    public function respondToNotice(ContractNotice $notice, User $actor): ContractNotice
    {
        if ($notice->status !== ContractNotice::STATUS_ISSUED) {
            throw new RuntimeException('Only issued notices can be responded to.');
        }
        $notice->status = ContractNotice::STATUS_RESPONDED;
        $notice->responded_at = now();
        $notice->updated_by_user_id = $actor->id;
        $notice->save();
        return $notice;
    }

    public function closeNotice(ContractNotice $notice, User $actor): ContractNotice
    {
        if (! in_array($notice->status, [ContractNotice::STATUS_ISSUED, ContractNotice::STATUS_RESPONDED], true)) {
            throw new RuntimeException('Only issued or responded notices can be closed.');
        }
        $notice->status = ContractNotice::STATUS_CLOSED;
        $notice->closed_at = now();
        $notice->updated_by_user_id = $actor->id;
        $notice->save();
        return $notice;
    }

    public function nextNoticeNumber(Contract $contract): string
    {
        $maxNo = $contract->notices()
            ->whereRaw("notice_no ~ '^NOTICE-[0-9]+$'")
            ->selectRaw("COALESCE(MAX(CAST(SUBSTRING(notice_no FROM 8) AS INTEGER)), 0) AS n")
            ->value('n');
        $next = (int) ($maxNo ?? 0) + 1;
        return 'NOTICE-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
