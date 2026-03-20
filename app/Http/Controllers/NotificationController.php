<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString();

        $notifications = $rows->through(fn (SystemNotification $n): array => $this->toUiNotification($n));

        $unreadCount = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->update(['status' => SystemNotification::STATUS_READ]);

        $unreadCount = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAllRead(Request $request): RedirectResponse|JsonResponse
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->update(['status' => SystemNotification::STATUS_READ]);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'unread_count' => 0]);
        }

        return redirect()->back()->with('success', 'All notifications marked as read.');
    }

    public function recent(Request $request): JsonResponse
    {
        $notifications = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (SystemNotification $n): array => $this->toUiNotification($n))
            ->values();

        $unreadCount = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', SystemNotification::STATUS_READ)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toUiNotification(SystemNotification $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'type' => 'system',
            'data' => [
                'event_code' => (string) $notification->event_key,
                'type' => 'info',
                'title' => (string) $notification->title,
                'body' => (string) $notification->message,
                'link' => $notification->link,
            ],
            'read_at' => $notification->status === SystemNotification::STATUS_READ
                ? ($notification->updated_at?->toIso8601String() ?? $notification->created_at?->toIso8601String())
                : null,
            'created_at' => $notification->created_at?->toIso8601String() ?? now()->toIso8601String(),
        ];
    }
}
