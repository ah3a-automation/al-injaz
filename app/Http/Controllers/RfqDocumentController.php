<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Rfq;
use App\Models\RfqDocument;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RfqDocumentController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function store(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorize('update', $rfq);

        $validated = $request->validate([
            'document_type'     => 'required|string|in:boq,drawings,specifications,other',
            'source_type'       => 'required|string|in:upload,google_drive,wetransfer,dropbox,onedrive',
            'title'             => 'required|string|max:200',
            'file'              => 'nullable|file|max:51200',
            'external_url'      => 'nullable|url|max:500',
            'external_provider' => 'nullable|string|in:google_drive,wetransfer,dropbox,onedrive',
        ]);

        $filePath      = null;
        $fileSizeBytes = null;
        $mimeType      = null;

        if ($request->hasFile('file')) {
            $file          = $request->file('file');
            $filePath      = $file->store("rfq-documents/{$rfq->id}", 'local');
            $fileSizeBytes = $file->getSize();
            $mimeType      = $file->getMimeType();
        }

        RfqDocument::create([
            'rfq_id'            => $rfq->id,
            'document_type'     => $validated['document_type'],
            'source_type'       => $validated['source_type'],
            'title'             => $validated['title'],
            'file_path'         => $filePath,
            'external_url'      => $validated['external_url'] ?? null,
            'external_provider' => $validated['external_provider'] ?? null,
            'file_size_bytes'   => $fileSizeBytes,
            'mime_type'         => $mimeType,
            'uploaded_by'       => $request->user()->id,
        ]);

        $this->activityLogger->log('rfq.document_added', $rfq, [], [], $request->user());

        return back()->with('success', 'Document added to RFQ.');
    }

    public function destroy(Request $request, Rfq $rfq, RfqDocument $document): RedirectResponse
    {
        $this->authorize('update', $rfq);

        if ($document->rfq_id !== $rfq->id) {
            abort(404);
        }

        if ($document->file_path) {
            Storage::disk('local')->delete($document->file_path);
        }

        $this->activityLogger->log('rfq.document_removed', $rfq, [], [], $request->user());

        $document->delete();

        return back()->with('success', 'Document removed.');
    }
}
