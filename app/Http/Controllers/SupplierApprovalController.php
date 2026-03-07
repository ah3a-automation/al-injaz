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
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        if ($supplier->status === Supplier::STATUS_BLACKLISTED
            && $request->input('action') !== 'reactivate') {
            abort(422, 'Blacklisted supplier must be reinstated first.');
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,request_info,suspend,blacklist,reactivate'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'rejection_reason' => ['required_if:action,reject', 'nullable', 'string', 'max:2000'],
        ]);

        if (! $supplier->canTransitionTo($validated['action'])) {
            return redirect()->back()->withErrors([
                'action' => "Cannot perform '{$validated['action']}' on a supplier with status '{$supplier->status}'",
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

        $messages = [
            'approve' => 'Supplier approved. Login credentials have been sent.',
            'reject' => 'Supplier has been rejected.',
            'request_info' => 'More information has been requested.',
            'suspend' => 'Supplier has been suspended.',
            'blacklist' => 'Supplier has been blacklisted.',
            'reactivate' => 'Supplier has been reactivated.',
        ];

        return redirect()->route('suppliers.show', $supplier)
            ->with('success', $messages[$validated['action']]);
    }

    public function resetLogin(Request $request, Supplier $supplier): RedirectResponse
    {
        if (! $request->user()->can('suppliers.approve')) {
            abort(403);
        }

        if (! $supplier->supplier_user_id) {
            return redirect()->back()->withErrors(['action' => 'Supplier has no login account.']);
        }

        (new ResetSupplierLoginCommand($supplier))->handle();

        $this->activityLogger->log(
            'suppliers.supplier.login_reset',
            $supplier,
            [],
            $supplier->toArray(),
            $request->user()
        );

        return redirect()->back()->with('success', 'Set-password email has been sent.');
    }
}
