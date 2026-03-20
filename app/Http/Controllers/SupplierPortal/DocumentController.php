<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\SupplierDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

final class DocumentController extends Controller
{
    private function getSupplier(Request $request)
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, 'Supplier profile not found.');
        }
        return $supplier;
    }

    private function authorizeDocument(Request $request, SupplierDocument $document): void
    {
        $supplier = $this->getSupplier($request);
        if ($document->supplier_id !== $supplier->id) {
            abort(403, 'Unauthorized.');
        }
    }

    public function show(Request $request, SupplierDocument $document): Response
    {
        $this->authorizeDocument($request, $document);

        $path = $document->file_path;
        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Document not found.');
        }

        $mime = $document->mime_type ?: Storage::disk('public')->mimeType($path) ?: 'application/octet-stream';

        return response(Storage::disk('public')->get($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($document->file_name) . '"',
        ]);
    }

    public function download(Request $request, SupplierDocument $document): Response
    {
        $this->authorizeDocument($request, $document);

        $path = $document->file_path;
        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Document not found.');
        }

        $mime = $document->mime_type ?: Storage::disk('public')->mimeType($path) ?: 'application/octet-stream';

        return response(Storage::disk('public')->get($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'attachment; filename="' . basename($document->file_name) . '"',
        ]);
    }
}
