<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Models\SupplierContact;
use App\Models\User;
use App\Services\MediaManager;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class MediaController extends Controller
{
    public function __construct(
        private readonly MediaManager $mediaManager
    ) {}

    /**
     * Stream media file (inline). Authorize that the current user can access this media.
     */
    public function show(Request $request, Media $media): Response
    {
        $this->authorizeMedia($request, $media);

        $path = $media->getPath();
        if (! $path || ! file_exists($path)) {
            abort(404, 'File not found.');
        }

        $mime = $media->mime_type ?: 'application/octet-stream';

        return response(file_get_contents($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($media->file_name) . '"',
        ]);
    }

    /**
     * Download media file.
     */
    public function download(Request $request, Media $media): Response
    {
        $this->authorizeMedia($request, $media);

        return $media->toResponse($request);
    }

    /**
     * Temporary signed URL endpoint: stream file. Used via URL::temporarySignedRoute.
     */
    public function temporary(Request $request, Media $media): Response
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Invalid or expired link.');
        }

        $path = $media->getPath();
        if (! $path || ! file_exists($path)) {
            abort(404, 'File not found.');
        }

        $mime = $media->mime_type ?: 'application/octet-stream';

        return response(file_get_contents($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($media->file_name) . '"',
        ]);
    }

    /**
     * Delete media. Authorize that the current user can delete this media.
     */
    public function destroy(Request $request, Media $media): Response
    {
        $this->authorizeMedia($request, $media);
        $this->mediaManager->delete($media);

        return response()->noContent();
    }

    private function authorizeMedia(Request $request, Media $media): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $model = $media->model;
        if (! $model) {
            abort(404, 'Media not found.');
        }

        if ($model instanceof User) {
            if ((int) $model->id !== (int) $user->id) {
                abort(403, 'Unauthorized.');
            }
            return;
        }

        if ($model instanceof Supplier) {
            $supplier = $user->supplierProfile;
            if (! $supplier || $supplier->id !== $model->id) {
                abort(403, 'Unauthorized.');
            }
            return;
        }

        if ($model instanceof SupplierContact) {
            abort_unless(
                $user->supplierProfile && $model->supplier_id === $user->supplierProfile->id,
                403,
                'Unauthorized.'
            );
            return;
        }

        if ($model instanceof Rfq) {
            if ($user->hasRole('supplier')) {
                $supplier = $user->supplierProfile;
                $invited = $supplier && RfqSupplier::where('rfq_id', $model->id)
                    ->where('supplier_id', $supplier->id)
                    ->whereNot('status', 'removed')
                    ->exists();
                abort_unless($invited, 403, 'Unauthorized.');
            }
            return;
        }

        if ($model instanceof RfqQuote) {
            if ($user->hasRole('supplier')) {
                $supplier = $user->supplierProfile;
                abort_unless(
                    $supplier && $supplier->id === $model->supplier_id,
                    403,
                    'Unauthorized.'
                );
            }

            return;
        }

        if ($model instanceof Project) {
            abort_unless(! $user->hasRole('supplier'), 403, 'Unauthorized.');
            return;
        }

        abort(403, 'Unauthorized.');
    }
}
