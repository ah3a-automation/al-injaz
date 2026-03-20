<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqQuote;
use Illuminate\Http\Request;
use Inertia\Response;

final class QuotationController extends Controller
{
    public function index(Request $request): Response
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, 'Supplier profile not found.');
        }

        $rfqIds = RfqQuote::where('supplier_id', $supplier->id)->pluck('rfq_id')->unique()->values();

        $query = Rfq::query()
            ->whereIn('id', $rfqIds)
            ->with(['project:id,name,name_en', 'procurementPackage:id,package_no,name'])
            ->orderByDesc('created_at');

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $payload = [
            'data' => $paginator->items(),
            'path' => $paginator->path(),
            'per_page' => $paginator->perPage(),
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
        ];

        return \Inertia\Inertia::render('SupplierPortal/Quotations/Index', ['quotations' => $payload]);
    }
}
