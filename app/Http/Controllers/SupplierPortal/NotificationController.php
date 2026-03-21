<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $notifications = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString();

        $unreadCount = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        return Inertia::render('SupplierPortal/Notifications/Index', [
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
        ]);
    }

    public function markRead(Request $request, SystemNotification $notification): RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, __('supplier_portal.unauthorized'));
        }

        $notification->update(['status' => SystemNotification::STATUS_READ]);

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->update(['status' => SystemNotification::STATUS_READ]);

        return back();
    }
}
