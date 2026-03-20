<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractNotice;
use App\Services\ActivityLogger;
use App\Services\Contracts\ContractNoticeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ContractNoticeController extends Controller
{
    public function __construct(
        private readonly ContractNoticeService $noticeService,
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function store(Request $request, Contract $contract): RedirectResponse
    {
        $this->authorize('update', $contract);
        if (! $contract->canManageNotices()) {
            return back()->with('error', __('contracts.notices.not_eligible'));
        }
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $notice = $this->noticeService->createNotice($contract, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.notice_created', $contract, [], ['notice_id' => (string) $notice->id, 'notice_no' => $notice->notice_no], $user);
        return back()->with('success', __('contracts.notices.created'));
    }

    public function update(Request $request, Contract $contract, ContractNotice $notice): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($notice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.notices.not_found'));
        }
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $this->noticeService->updateDraftNotice($notice, $validated, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        return back()->with('success', __('contracts.notices.updated'));
    }

    public function issue(Request $request, Contract $contract, ContractNotice $notice): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($notice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.notices.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $notice = $this->noticeService->issueNotice($notice, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.notice_issued', $contract, [], ['notice_id' => (string) $notice->id, 'notice_no' => $notice->notice_no], $user);
        return back()->with('success', __('contracts.notices.issued'));
    }

    public function respond(Request $request, Contract $contract, ContractNotice $notice): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($notice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.notices.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $notice = $this->noticeService->respondToNotice($notice, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.notice_responded', $contract, [], ['notice_id' => (string) $notice->id, 'notice_no' => $notice->notice_no], $user);
        return back()->with('success', __('contracts.notices.responded'));
    }

    public function close(Request $request, Contract $contract, ContractNotice $notice): RedirectResponse
    {
        $this->authorize('update', $contract);
        if ($notice->contract_id !== $contract->id) {
            return back()->with('error', __('contracts.notices.not_found'));
        }
        /** @var \App\Models\User $user */
        $user = $request->user();
        try {
            $notice = $this->noticeService->closeNotice($notice, $user);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $this->activityLogger->log('contracts.contract.notice_closed', $contract, [], ['notice_id' => (string) $notice->id, 'notice_no' => $notice->notice_no], $user);
        return back()->with('success', __('contracts.notices.closed'));
    }
}
