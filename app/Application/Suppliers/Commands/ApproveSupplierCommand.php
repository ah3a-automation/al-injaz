<?php

declare(strict_types=1);

namespace App\Application\Suppliers\Commands;

use App\Events\SupplierApproved;
use App\Events\SupplierRejected;
use App\Events\SupplierStatusChanged;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

final class ApproveSupplierCommand
{
    public function __construct(
        private readonly Supplier $supplier,
        private readonly string $action,
        private readonly int $performedByUserId,
        private readonly ?string $notes = null,
        private readonly ?string $rejectionReason = null,
    ) {}

    public function handle(): Supplier
    {
        if (! $this->supplier->canTransitionTo($this->action)) {
            throw new \InvalidArgumentException(
                "Cannot perform '{$this->action}' on supplier with status '{$this->supplier->status}'"
            );
        }

        $performer = User::findOrFail($this->performedByUserId);
        $oldStatus = $this->supplier->status;

        $newStatus = match ($this->action) {
            'approve' => Supplier::STATUS_APPROVED,
            'reject' => Supplier::STATUS_REJECTED,
            'request_info' => Supplier::STATUS_MORE_INFO_REQUESTED,
            'suspend' => Supplier::STATUS_SUSPENDED,
            'blacklist' => Supplier::STATUS_BLACKLISTED,
            'reactivate' => Supplier::STATUS_APPROVED,
            default => throw new \InvalidArgumentException("Unknown action: {$this->action}"),
        };

        return DB::transaction(function () use ($newStatus, $performer, $oldStatus) {
            $updateData = ['status' => $newStatus];

            switch ($this->action) {
                case 'approve':
                case 'reactivate':
                    $updateData['approved_at'] = now();
                    $updateData['approved_by_user_id'] = $this->performedByUserId;
                    $updateData['approval_notes'] = $this->notes;
                    $updateData['is_verified'] = true;
                    $updateData['compliance_status'] = Supplier::COMPLIANCE_VERIFIED;
                    $updateData['rejected_at'] = null;
                    $updateData['rejected_by_user_id'] = null;
                    $updateData['suspended_at'] = null;
                    $updateData['suspension_reason'] = null;
                    $updateData['suspended_by_user_id'] = null;
                    $updateData['blacklisted_at'] = null;
                    $updateData['blacklist_reason'] = null;
                    $updateData['blacklisted_by_user_id'] = null;
                    $supplierUser = $this->createOrReactivateSupplierLogin($performer);
                    $updateData['supplier_user_id'] = $supplierUser->id;
                    break;
                case 'reject':
                    $updateData['rejected_at'] = now();
                    $updateData['rejected_by_user_id'] = $this->performedByUserId;
                    $updateData['rejection_reason'] = $this->rejectionReason;
                    $updateData['is_verified'] = false;
                    $updateData['compliance_status'] = Supplier::COMPLIANCE_REJECTED;
                    if ($this->supplier->supplier_user_id) {
                        User::find($this->supplier->supplier_user_id)
                            ?->update(['status' => User::STATUS_INACTIVE]);
                    }
                    break;
                case 'request_info':
                    $updateData['more_info_notes'] = $this->notes;
                    $this->supplier->generateRegistrationToken();
                    break;
                case 'suspend':
                    $updateData['suspended_at'] = now();
                    $updateData['suspension_reason'] = $this->notes;
                    $updateData['suspended_by_user_id'] = $this->performedByUserId;
                    if ($this->supplier->supplier_user_id) {
                        User::find($this->supplier->supplier_user_id)
                            ?->update(['status' => User::STATUS_SUSPENDED]);
                    }
                    break;
                case 'blacklist':
                    $updateData['blacklisted_at'] = now();
                    $updateData['blacklist_reason'] = $this->notes;
                    $updateData['blacklisted_by_user_id'] = $this->performedByUserId;
                    $updateData['is_verified'] = false;
                    if ($this->supplier->supplier_user_id) {
                        User::find($this->supplier->supplier_user_id)
                            ?->update(['status' => User::STATUS_INACTIVE]);
                    }
                    break;
            }

            $this->supplier->forceFill($updateData)->save();
            $freshSupplier = $this->supplier->fresh();

            if ($this->action === 'approve' || $this->action === 'reactivate') {
                event(new SupplierApproved($freshSupplier, $performer));
            } elseif ($this->action === 'reject') {
                event(new SupplierRejected($freshSupplier, $performer));
            }
            event(new SupplierStatusChanged(
                $freshSupplier,
                $this->action,
                $oldStatus,
                $newStatus,
                $performer
            ));

            return $freshSupplier;
        });
    }

    private function createOrReactivateSupplierLogin(User $performer): User
    {
        if (empty($this->supplier->email)) {
            throw new \InvalidArgumentException(
                'Supplier must have an email address to create a login account.'
            );
        }

        if ($this->supplier->supplier_user_id) {
            $existingUser = User::find($this->supplier->supplier_user_id);
            if ($existingUser) {
                $existingUser->update(['status' => User::STATUS_ACTIVE]);
                return $existingUser;
            }
        }

        $existingByEmail = User::where('email', $this->supplier->email)->first();
        if ($existingByEmail) {
            $existingByEmail->update(['status' => User::STATUS_ACTIVE]);
            if (! $existingByEmail->hasRole('supplier')) {
                $existingByEmail->assignRole('supplier');
            }
            $this->sendSetPasswordEmail($existingByEmail);
            return $existingByEmail;
        }

        $user = User::create([
            'name' => $this->supplier->legal_name_en,
            'email' => $this->supplier->email,
            'password' => Hash::make(Str::random(32)),
            'status' => User::STATUS_ACTIVE,
            'must_change_password' => true,
            'email_verified_at' => now(),
            'created_by_user_id' => $performer->id,
        ]);
        $user->assignRole('supplier');
        $this->sendSetPasswordEmail($user);
        return $user;
    }

    private function sendSetPasswordEmail(User $user): void
    {
        $token = Password::broker('users')->createToken($user);
        \Log::info('Supplier set-password link for ' . $user->email . ': ' .
            url('/password/reset/' . $token . '?email=' . urlencode($user->email)));
    }
}
