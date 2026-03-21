<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ProcurementPackage;
use App\Models\Project;
use App\Models\PurchaseRequest;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TaskLinkableSearchController extends Controller
{
    private const LIMIT = 15;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:project,supplier,rfq,package,contract,purchase_request'],
            'q' => ['required', 'string', 'min:1', 'max:100'],
        ]);

        $term = $this->escapeLikePattern($validated['q']);
        $type = $validated['type'];

        $data = match ($type) {
            'project' => $this->searchProjects($term),
            'supplier' => $this->searchSuppliers($term),
            'rfq' => $this->searchRfqs($term),
            'package' => $this->searchPackages($term),
            'contract' => $this->searchContracts($term),
            'purchase_request' => $this->searchPurchaseRequests($term),
        };

        return response()->json(['data' => $data]);
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchProjects(string $term): array
    {
        return Project::query()
            ->where(function ($q) use ($term): void {
                $q->where('name', 'ilike', '%'.$term.'%')
                    ->orWhere('code', 'ilike', '%'.$term.'%');
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'status', 'code'])
            ->map(static function (Project $p): array {
                $label = $p->name;
                if (is_string($p->code) && $p->code !== '') {
                    $label = $p->code.' — '.$p->name;
                }

                return [
                    'id' => (string) $p->id,
                    'label' => $label,
                    'status' => $p->status,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchSuppliers(string $term): array
    {
        return Supplier::query()
            ->where(function ($q) use ($term): void {
                $q->where('trade_name', 'ilike', '%'.$term.'%')
                    ->orWhere('legal_name_en', 'ilike', '%'.$term.'%')
                    ->orWhere('legal_name_ar', 'ilike', '%'.$term.'%')
                    ->orWhere('supplier_code', 'ilike', '%'.$term.'%');
            })
            ->orderBy('trade_name')
            ->limit(self::LIMIT)
            ->get(['id', 'trade_name', 'legal_name_en', 'status'])
            ->map(static function (Supplier $s): array {
                $label = is_string($s->trade_name) && $s->trade_name !== ''
                    ? $s->trade_name
                    : (string) ($s->legal_name_en ?? $s->id);

                return [
                    'id' => (string) $s->id,
                    'label' => $label,
                    'status' => $s->status,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchRfqs(string $term): array
    {
        return Rfq::query()
            ->where(function ($q) use ($term): void {
                $q->where('rfq_number', 'ilike', '%'.$term.'%')
                    ->orWhere('title', 'ilike', '%'.$term.'%');
            })
            ->orderByDesc('created_at')
            ->limit(self::LIMIT)
            ->get(['id', 'rfq_number', 'title', 'status'])
            ->map(static function (Rfq $r): array {
                $label = trim(($r->rfq_number ?? '').' — '.($r->title ?? ''), ' —');

                return [
                    'id' => (string) $r->id,
                    'label' => $label !== '' ? $label : (string) $r->id,
                    'status' => $r->status,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchPackages(string $term): array
    {
        return ProcurementPackage::query()
            ->where(function ($q) use ($term): void {
                $q->where('name', 'ilike', '%'.$term.'%')
                    ->orWhere('package_no', 'ilike', '%'.$term.'%');
            })
            ->orderBy('package_no')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'package_no', 'status'])
            ->map(static function (ProcurementPackage $p): array {
                $no = $p->package_no ?? '';
                $label = $no !== '' ? $no.' — '.($p->name ?? '') : (string) ($p->name ?? $p->id);

                return [
                    'id' => (string) $p->id,
                    'label' => $label,
                    'status' => $p->status,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchContracts(string $term): array
    {
        return Contract::query()
            ->where(function ($q) use ($term): void {
                $q->where('contract_number', 'ilike', '%'.$term.'%')
                    ->orWhere('title_en', 'ilike', '%'.$term.'%')
                    ->orWhere('title_ar', 'ilike', '%'.$term.'%');
            })
            ->orderBy('contract_number')
            ->limit(self::LIMIT)
            ->get(['id', 'contract_number', 'title_en', 'title_ar', 'status'])
            ->map(static function (Contract $c): array {
                $title = is_string($c->title_en) && $c->title_en !== ''
                    ? $c->title_en
                    : (string) ($c->title_ar ?? '');
                $num = $c->contract_number ?? '';
                $label = $num !== '' ? $num.' — '.$title : $title;

                return [
                    'id' => (string) $c->id,
                    'label' => $label !== '' ? $label : (string) $c->id,
                    'status' => $c->status,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: string, label: string, status: string|null}>
     */
    private function searchPurchaseRequests(string $term): array
    {
        return PurchaseRequest::query()
            ->where(function ($q) use ($term): void {
                $q->where('pr_number', 'ilike', '%'.$term.'%')
                    ->orWhere('title_en', 'ilike', '%'.$term.'%')
                    ->orWhere('title_ar', 'ilike', '%'.$term.'%');
            })
            ->orderBy('pr_number')
            ->limit(self::LIMIT)
            ->get(['id', 'pr_number', 'title_en', 'title_ar', 'status'])
            ->map(static function (PurchaseRequest $pr): array {
                $title = is_string($pr->title_en) && $pr->title_en !== ''
                    ? $pr->title_en
                    : (string) ($pr->title_ar ?? '');
                $num = $pr->pr_number ?? '';
                $label = $num !== '' ? $num.' — '.$title : $title;

                return [
                    'id' => (string) $pr->id,
                    'label' => $label !== '' ? $label : (string) $pr->id,
                    'status' => $pr->status,
                ];
            })
            ->all();
    }

    private function escapeLikePattern(string $raw): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $raw);
    }
}
