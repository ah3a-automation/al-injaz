<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class SupplierDocumentController extends Controller
{
    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'document_type' => [
                'required',
                'string',
                Rule::in(SupplierDocument::allowedTypes()),
            ],
            'file_name' => ['required', 'string', 'max:255'],
            'file_path' => ['required', 'string', 'max:500'],
            'mime_type' => ['nullable', 'string', 'max:100'],
            'file_size' => ['nullable', 'integer', 'min:0'],
            'expiry_date' => ['nullable', 'date', 'after:today'],
            'notes' => ['nullable', 'string'],
        ]);

        SupplierDocument::createVersionedRecord(
            $supplier,
            $validated['document_type'],
            $validated['file_path'],
            $request->user()->id,
            [
                'mime_type' => $validated['mime_type'] ?? null,
                'file_size' => $validated['file_size'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ],
            $validated['file_name'],
        );

        return redirect()->back()->with('success', 'Document added.');
    }

    public function destroy(Request $request, Supplier $supplier, SupplierDocument $document): RedirectResponse
    {
        $this->authorize('update', $supplier);

        if ($document->supplier_id !== $supplier->id) {
            abort(404);
        }

        $document->delete();

        return redirect()->back()->with('success', 'Document deleted.');
    }
}
