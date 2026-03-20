<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function switch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'in:en,ar'],
        ]);

        $locale = $validated['locale'];

        session(['locale' => $locale]);
        app()->setLocale($locale);

        return back();
    }
}

