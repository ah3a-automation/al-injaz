<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Application\Suppliers\Commands\ApproveSupplierCommand;
use App\Application\Suppliers\Commands\ResetSupplierLoginCommand;
use App\Models\Supplier;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class SupplierApprovalController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function approve(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('approve', $supplier);

        if ($supplier->status === Supplier::STATUS_BLACKLISTED
            && $request->input('action') !== 'reactivate') {
            abort(422, __('suppliers.blacklisted_supplier_reinstate'));
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,request_info,suspend,blacklist,reactivate'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'rejection_reason' => ['required_if:action,reject', 'nullable', 'string', 'max:2000'],
        ]);

        if (! $supplier->canTransitionTo($validated['action'])) {
            return redirect()->back()->withErrors([
                'action' => __('suppliers.approval_transition_error', [
                    'action' => $validated['action'],
                    'status' => $supplier->status,
                ]),
            ]);
        }

        $oldState = $supplier->toArray();
        $command = new ApproveSupplierCommand(
            supplier: $supplier,
            action: $validated['action'],
            performedByUserId: (int) $request->user()->id,
            notes: $validated['notes'] ?? null,
            rejectionReason: $validated['rejection_reason'] ?? null,
        );
        $freshSupplier = $command->handle();

        $this->activityLogger->log(
            'suppliers.supplier.' . $validated['action'],
            $freshSupplier,
            $oldState,
            $freshSupplier->toArray(),
            $request->user(),
            [
                'action' => $validated['action'],
                'old_status' => $supplier->status,
                'new_status' => $freshSupplier->status,
                'notes' => $validated['notes'] ?? null,
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]
        );

        $message = match ($validated['action']) {
            'approve' => __('suppliers.flash_approval_approve_credentials'),
            'reject' => __('suppliers.flash_approval_reject'),
            'request_info' => __('suppliers.flash_approval_request_info'),
            'suspend' => __('suppliers.flash_approval_suspend'),
            'blacklist' => __('suppliers.flash_approval_blacklist'),
            'reactivate' => __('suppliers.flash_approval_reactivate_credentials'),
            default => __('suppliers.updated'),
        };

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', $message);
    }

    public function resetLogin(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('approve', $supplier);

        if (! $supplier->supplier_user_id) {
            return redirect()->back()->withErrors(['action' => __('suppliers.flash_reset_password_no_account')]);
        }

        (new ResetSupplierLoginCommand($supplier))->handle();

        $this->activityLogger->log(
            'suppliers.supplier.login_reset',
            $supplier,
            [],
            $supplier->toArray(),
            $request->user()
        );

        return redirect()->back()->with('success', __('suppliers.flash_reset_password_sent'));
    }
}
