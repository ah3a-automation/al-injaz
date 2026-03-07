<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Supplier;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureSupplierIsApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            $user = auth()->user();
            if ($user->hasRole('supplier')) {
                $supplier = $user->supplierProfile;
                if (! $supplier || $supplier->status !== Supplier::STATUS_APPROVED) {
                    auth()->logout();
                    $request->session()->invalidate();
                    return redirect('/login')
                        ->withErrors(['email' => 'Your supplier account is not active.']);
                }
            }
        }

        return $next($request);
    }
}
