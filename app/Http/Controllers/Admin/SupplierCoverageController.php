<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\RfqAward;
use App\Models\RfqQuote;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use App\Models\SupplierCapability;
use App\Models\SupplierCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class SupplierCoverageController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Supplier::class);

        $north = $request->input('north');
        $south = $request->input('south');
        $east = $request->input('east');
        $west = $request->input('west');
        $hasBounds = $north !== null && $south !== null && $east !== null && $west !== null
            && is_numeric($north) && is_numeric($south) && is_numeric($east) && is_numeric($west);
        if ($hasBounds) {
            $north = (float) $north;
            $south = (float) $south;
            $east = (float) $east;
            $west = (float) $west;
            $latMin = min($south, $north);
            $latMax = max($south, $north);
            $lngMin = min($west, $east);
            $lngMax = max($west, $east);
        } else {
            $latMin = 16.5;
            $latMax = 32.5;
            $lngMin = 34.0;
            $lngMax = 60.0;
        }

        $suppliers = Supplier::query()
            ->with(['categories:id,name_en,name_ar,code', 'capabilities:id,name'])
            ->withCount([
                'rfqSuppliers as rfq_invited_count',
                'awards as awards_count',
                'rfqQuotes as rfq_quotes_count' => fn ($q) => $q->where('status', 'submitted'),
            ])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereBetween('latitude', [$latMin, $latMax])
            ->whereBetween('longitude', [$lngMin, $lngMax]);

        if ($request->filled('category')) {
            $suppliers->whereHas('categories', fn ($q) => $q->where('supplier_categories.id', $request->category));
        }

        if ($request->filled('city')) {
            $suppliers->where('city', $request->city);
        }

        if ($request->filled('capability')) {
            $suppliers->whereHas('capabilities', fn ($q) => $q->where('supplier_capabilities.id', (int) $request->capability));
        }

        $lat = $request->input('project_lat');
        $lng = $request->input('project_lng');
        $radiusKm = $request->input('radius_km');
        if ($lat !== null && $lng !== null && $radiusKm !== null && is_numeric($lat) && is_numeric($lng) && is_numeric($radiusKm)) {
            $suppliers->withinRadius((float) $lat, (float) $lng, (float) $radiusKm);
        }

        $suppliers = $suppliers->get();

        $rfqId = $request->input('rfq_id');
        $rfqStatusMap = [];
        if ($rfqId && \Illuminate\Support\Str::isUuid($rfqId)) {
            $invited = RfqSupplier::where('rfq_id', $rfqId)->pluck('status', 'supplier_id')->all();
            $awarded = RfqAward::where('rfq_id', $rfqId)->pluck('id', 'supplier_id')->all();
            $submitted = RfqQuote::where('rfq_id', $rfqId)->where('status', 'submitted')->pluck('id', 'supplier_id')->all();
            foreach ($suppliers as $s) {
                $id = $s->id;
                if (isset($awarded[$id])) {
                    $rfqStatusMap[$id] = 'awarded';
                } elseif (isset($submitted[$id])) {
                    $rfqStatusMap[$id] = 'submitted';
                } elseif (isset($invited[$id])) {
                    $rfqStatusMap[$id] = $invited[$id] === 'quoted' ? 'submitted' : 'invited';
                } else {
                    $rfqStatusMap[$id] = 'not_invited';
                }
            }
        }

        $suppliersArray = $suppliers->map(function ($s) use ($rfqStatusMap) {
            $item = [
                'id' => $s->id,
                'legal_name_en' => $s->legal_name_en,
                'city' => $s->city,
                'latitude' => $s->latitude,
                'longitude' => $s->longitude,
                'categories' => $s->categories->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->all(),
                'capabilities' => $s->capabilities->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->all(),
                'rfq_invited_count' => (int) ($s->rfq_invited_count ?? 0),
                'rfq_quotes_count' => (int) ($s->rfq_quotes_count ?? 0),
                'awards_count' => (int) ($s->awards_count ?? 0),
            ];
            if (isset($rfqStatusMap[$s->id])) {
                $item['rfq_status'] = $rfqStatusMap[$s->id];
            }
            return $item;
        })->values()->all();

        $citiesCovered = $suppliers->pluck('city')->filter()->unique()->count();
        $categoriesCovered = $suppliers->flatMap(fn ($s) => $s->categories->pluck('name'))->unique()->count();
        $suppliersNearProject = ($lat !== null && $lng !== null && $radiusKm !== null && is_numeric($lat) && is_numeric($lng) && is_numeric($radiusKm))
            ? $suppliers->count()
            : 0;

        $categories = SupplierCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name_en', 'name_ar', 'code', 'level', 'parent_id']);
        $cities = Supplier::query()->whereNotNull('city')->distinct()->orderBy('city')->pluck('city')->values()->all();
        $capabilities = SupplierCapability::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $rfqs = Rfq::query()->orderByDesc('created_at')->limit(100)->get(['id', 'rfq_number', 'title']);

        return Inertia::render('Admin/Suppliers/CoverageMap', [
            'suppliers' => $suppliersArray,
            'stats' => [
                'suppliers_visible' => count($suppliersArray),
                'cities_covered' => $citiesCovered,
                'categories_covered' => $categoriesCovered,
                'suppliers_near_project' => $suppliersNearProject,
            ],
            'categories' => $categories,
            'cities' => $cities,
            'capabilities' => $capabilities,
            'rfqs' => $rfqs,
            'filters' => [
                'category' => $request->input('category'),
                'city' => $request->input('city'),
                'capability' => $request->input('capability'),
                'project_lat' => $request->input('project_lat'),
                'project_lng' => $request->input('project_lng'),
                'radius_km' => $request->input('radius_km'),
                'rfq_id' => $request->input('rfq_id'),
                'north' => $request->input('north'),
                'south' => $request->input('south'),
                'east' => $request->input('east'),
                'west' => $request->input('west'),
            ],
        ]);
    }
}
