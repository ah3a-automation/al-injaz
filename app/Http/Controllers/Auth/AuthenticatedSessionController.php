<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $intended = $request->session()->pull('url.intended');
        $user = $request->user();
        $default = $user->hasRole('supplier')
            ? ($this->supplierIsApproved($user) ? route('supplier.dashboard', [], false) : route('supplier.pending', [], false))
            : route('dashboard', [], false);

        $target = $this->resolveLoginRedirectTarget($user, $intended, $default);

        return redirect()->to($target);
    }

    private function supplierIsApproved($user): bool
    {
        $supplier = $user->supplierProfile;

        return $supplier && $supplier->status === Supplier::STATUS_APPROVED;
    }

    private function resolveLoginRedirectTarget($user, mixed $intended, string $default): string
    {
        if (! is_string($intended) || $intended === '') {
            return $default;
        }

        if (! $user->hasRole('supplier')) {
            return $intended;
        }

        $path = parse_url($intended, PHP_URL_PATH);

        return is_string($path) && str_starts_with($path, '/supplier')
            ? $intended
            : $default;
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('logout.screen');
    }
}
