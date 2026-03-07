<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class SupplierDocumentController extends Controller
{
    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'document_type' => [
                'required',
                'string',
                'in:commercial_registration,unified_number,vat_certificate,business_license,national_address,bank_letter,company_profile,iso_certificate,other',
            ],
            'file_name' => ['required', 'string', 'max:255'],
            'file_path' => ['required', 'string', 'max:500'],
            'mime_type' => ['nullable', 'string', 'max:100'],
            'file_size' => ['nullable', 'integer', 'min:0'],
            'expiry_date' => ['nullable', 'date', 'after:today'],
            'notes' => ['nullable', 'string'],
        ]);

        SupplierDocument::create([
            'id' => (string) Str::uuid(),
            'supplier_id' => $supplier->id,
            'uploaded_by_user_id' => $request->user()->id,
            'is_mandatory' => in_array($validated['document_type'], SupplierDocument::MANDATORY_TYPES, true),
            'document_type' => $validated['document_type'],
            'file_name' => $validated['file_name'],
            'file_path' => $validated['file_path'],
            'mime_type' => $validated['mime_type'] ?? null,
            'file_size' => $validated['file_size'] ?? null,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

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
