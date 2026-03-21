<?php

declare(strict_types=1);

namespace App\Http\Controllers\SupplierPortal;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    /**
     * Show "pending approval" page for suppliers who are not yet approved.
     */
    public function pending(Request $request): Response
    {
        $supplier = $request->user()->supplierProfile;

        return Inertia::render('SupplierPortal/Pending', [
            'supplier' => $supplier ? $supplier->only('id', 'supplier_code', 'legal_name_en', 'legal_name_ar', 'status') : null,
        ]);
    }

    public function __invoke(Request $request): Response
    {
        $supplier = $request->user()->supplierProfile;
        if (! $supplier) {
            abort(403, __('suppliers.supplier_profile_not_found'));
        }
        $supplier->load('media');

        $invitedRfqIds = RfqSupplier::where('supplier_id', $supplier->id)
            ->whereNot('status', 'removed')
            ->pluck('rfq_id');

        $openStatuses = ['draft', 'internally_approved', 'issued', 'supplier_questions_open', 'responses_received', 'under_evaluation', 'recommended'];
        $closedStatuses = ['awarded', 'closed', 'cancelled'];

        $openRfqs = Rfq::whereIn('id', $invitedRfqIds)->whereIn('status', $openStatuses)->count();
        $submittedQuotes = RfqQuote::where('supplier_id', $supplier->id)->where('status', 'submitted')->count();
        $underEvaluation = Rfq::whereIn('id', $invitedRfqIds)->where('status', 'under_evaluation')->count();
        $awardedRfqs = Rfq::whereIn('id', $invitedRfqIds)->where('status', 'awarded')->count();

        $pendingSubmission = Rfq::whereIn('id', $invitedRfqIds)
            ->whereIn('status', $openStatuses)
            ->whereDoesntHave('rfqQuotes', fn ($q) => $q->where('supplier_id', $supplier->id)->where('status', 'submitted'))
            ->count();

        return Inertia::render('SupplierPortal/Dashboard', [
            'supplier' => $supplier->only('id', 'supplier_code', 'legal_name_en', 'legal_name_ar', 'status'),
            'metrics' => [
                'pending_submission' => $pendingSubmission,
                'open_rfqs' => $openRfqs,
                'submitted_quotes' => $submittedQuotes,
                'under_evaluation' => $underEvaluation,
                'awarded_rfqs' => $awardedRfqs,
            ],
        ]);
    }
}
