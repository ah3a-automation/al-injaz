<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): InertiaResponse
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill($request->safe()->only(['name', 'email']));

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->hasFile('avatar')) {
            $user->clearMediaCollection('avatar');
            $user->addMediaFromRequest('avatar')->toMediaCollection('avatar');
        }

        $user->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    /**
     * Serve the authenticated user's avatar image (media library or legacy path).
     */
    public function avatar(Request $request): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(404, 'Avatar not found.');
        }

        $media = $user->getFirstMedia('avatar');
        if ($media) {
            $path = $media->getPath();
            if ($path && file_exists($path)) {
                $mime = $media->mime_type ?: 'application/octet-stream';
                return response(file_get_contents($path), 200, [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline',
                ]);
            }
        }

        if ($user->avatar_path) {
            $disk = config('filesystems.default');
            if (Storage::disk($disk)->exists($user->avatar_path)) {
                $mime = Storage::disk($disk)->mimeType($user->avatar_path) ?: 'application/octet-stream';
                return response(Storage::disk($disk)->get($user->avatar_path), 200, [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline',
                ]);
            }
        }

        abort(404, 'Avatar not found.');
    }
}
