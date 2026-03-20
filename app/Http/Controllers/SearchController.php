<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Rfq;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class SearchController extends Controller
{
    private const LIMIT_PER_GROUP = 5;

    private const RECENT_MAX = 10;

    private const SIMILARITY_THRESHOLD = 0.1;

    /**
     * Parse search prefix: project:, supplier:, rfq: → limit to that model only.
     */
    private function parseSearchPrefix(string $q): array
    {
        $q = trim($q);
        $prefix = null;
        $term = $q;
        if (preg_match('/^(project|supplier|rfq):\s*(.*)$/i', $q, $m)) {
            $prefix = strtolower($m[1]);
            $term = trim($m[2]);
        }
        return [$prefix, $term];
    }

    private function hasPgTrgm(): bool
    {
        $result = DB::selectOne("SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'");
        return $result !== null;
    }

    /**
     * Global search: grouped results, recent, favorites, commands. Fuzzy + prefix support.
     */
    public function search(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'results' => $this->emptyResults(),
                'recent' => [],
                'favorites' => [],
                'commands' => [],
            ], 200);
        }

        $rawQ = trim((string) $request->input('q', ''));
        [$prefix, $q] = $this->parseSearchPrefix($rawQ);
        $term = $q !== '' ? '%' . $q . '%' : null;
        $qStart = $q !== '' ? $q . '%' : null;
        $useFuzzy = $this->hasPgTrgm() && $q !== '';

        $results = [
            'projects' => [],
            'suppliers' => [],
            'rfqs' => [],
            'contracts' => [],
            'settings' => [],
        ];

        $searchProjects = ($prefix === null || $prefix === 'project') && $user->can('projects.viewAny');
        $searchSuppliers = ($prefix === null || $prefix === 'supplier') && $user->can('suppliers.view');
        $searchRfqs = ($prefix === null || $prefix === 'rfq') && $user->can('rfq.view');

        if ($searchProjects) {
            $results['projects'] = $this->searchProjects($q, $term, $qStart, $useFuzzy);
        }
        if ($searchSuppliers) {
            $results['suppliers'] = $this->searchSuppliers($q, $term, $qStart, $useFuzzy);
        }
        if ($searchRfqs) {
            $results['rfqs'] = $this->searchRfqs($q, $term, $qStart, $useFuzzy);
        }

        $results['settings'] = $this->settingsEntries($user, $q);
        $recent = $this->hasRecentTable() ? $this->getRecent($user) : [];
        $favorites = $this->hasFavoritesTable() ? $this->getFavorites($user) : [];
        $commands = $this->quickCommands($user, $rawQ);

        return response()->json([
            'results' => $results,
            'recent' => $recent,
            'favorites' => $favorites,
            'commands' => $commands,
        ]);
    }

    private function emptyResults(): array
    {
        return [
            'projects' => [],
            'suppliers' => [],
            'rfqs' => [],
            'contracts' => [],
            'settings' => [],
        ];
    }

    private function searchProjects(string $q, ?string $term, ?string $qStart, bool $useFuzzy): array
    {
        $query = Project::query()->with(['owner'])->withCount('rfqs');
        if ($term === null) {
            $query->orderByDesc('updated_at');
        } else {
            $this->applyProjectWhere($query, $term, $q, $useFuzzy);
            $this->applyProjectOrder($query, $q, $qStart, $term, $useFuzzy);
        }
        return $query->limit(self::LIMIT_PER_GROUP)->get()->map(fn (Project $p) => [
            'type' => 'project',
            'id' => $p->id,
            'label' => $p->name,
            'description' => $p->code ?: $p->status,
            'url' => route('projects.show', $p->id),
            'icon' => 'folder',
            'breadcrumbs' => 'Project • ' . ($p->status ?? '—'),
            'status' => $p->status,
            'preview' => [
                'title' => $p->name,
                'status' => $p->status,
                'project_manager' => $p->owner?->name,
                'rfq_count' => $p->rfqs_count ?? 0,
            ],
        ])->values()->all();
    }

    private function applyProjectWhere($query, string $term, string $q, bool $useFuzzy): void
    {
        if ($useFuzzy) {
            $query->where(function ($qry) use ($term, $q) {
                $qry->where('name', 'ilike', $term)
                    ->orWhere('code', 'ilike', $term)
                    ->orWhere('name_en', 'ilike', $term)
                    ->orWhere('name_ar', 'ilike', $term)
                    ->orWhereRaw('similarity(name, ?) > ?', [$q, self::SIMILARITY_THRESHOLD])
                    ->orWhereRaw('similarity(code, ?) > ?', [$q, self::SIMILARITY_THRESHOLD]);
            });
        } else {
            $query->where(function ($qry) use ($term) {
                $qry->where('name', 'ilike', $term)
                    ->orWhere('code', 'ilike', $term)
                    ->orWhere('name_en', 'ilike', $term)
                    ->orWhere('name_ar', 'ilike', $term);
            });
        }
    }

    private function applyProjectOrder($query, string $q, ?string $qStart, string $term, bool $useFuzzy): void
    {
        $qBind = $q;
        if ($useFuzzy) {
            $query->orderByRaw(
                "CASE WHEN code = ? THEN 0 WHEN code ILIKE ? THEN 1 WHEN name ILIKE ? THEN 2 WHEN name ILIKE ? OR name_en ILIKE ? OR name_ar ILIKE ? THEN 3 ELSE 4 END, similarity(name, ?) DESC NULLS LAST",
                [$qBind, $qStart, $qStart, $term, $term, $term, $q]
            );
        } else {
            $query->orderByRaw(
                "CASE WHEN code = ? THEN 0 WHEN code ILIKE ? THEN 1 WHEN name ILIKE ? THEN 2 WHEN name ILIKE ? OR name_en ILIKE ? OR name_ar ILIKE ? THEN 3 ELSE 4 END",
                [$qBind, $qStart, $qStart, $term, $term, $term]
            );
        }
    }

    private function searchSuppliers(string $q, ?string $term, ?string $qStart, bool $useFuzzy): array
    {
        $query = Supplier::query()->with(['categories']);
        if ($term === null) {
            $query->orderByDesc('updated_at');
        } else {
            $this->applySupplierWhere($query, $term, $q, $useFuzzy);
            $this->applySupplierOrder($query, $q, $qStart, $term, $useFuzzy);
        }
        $suppliers = $query->limit(self::LIMIT_PER_GROUP)->get();
        return $suppliers->map(function (Supplier $s) {
            $categories = $s->relationLoaded('categories') ? $s->categories->pluck('name')->take(3)->implode(', ') : '';
            return [
                'type' => 'supplier',
                'id' => $s->id,
                'label' => $s->legal_name_en,
                'description' => $s->supplier_code ?: $s->trade_name,
                'url' => route('suppliers.show', $s->id),
                'icon' => 'building',
                'breadcrumbs' => 'Supplier • ' . ($s->city ?: '—'),
                'status' => $s->status,
                'preview' => [
                    'title' => $s->legal_name_en,
                    'categories' => $categories,
                    'city' => $s->city,
                    'rfq_invitations' => 0,
                ],
            ];
        })->values()->all();
    }

    private function applySupplierWhere($query, string $term, string $q, bool $useFuzzy): void
    {
        if ($useFuzzy) {
            $query->where(function ($qry) use ($term, $q) {
                $qry->where('legal_name_en', 'ilike', $term)
                    ->orWhere('trade_name', 'ilike', $term)
                    ->orWhere('supplier_code', 'ilike', $term)
                    ->orWhereRaw('similarity(legal_name_en, ?) > ?', [$q, self::SIMILARITY_THRESHOLD])
                    ->orWhereRaw('similarity(supplier_code, ?) > ?', [$q, self::SIMILARITY_THRESHOLD]);
            });
        } else {
            $query->where(function ($qry) use ($term) {
                $qry->where('legal_name_en', 'ilike', $term)
                    ->orWhere('trade_name', 'ilike', $term)
                    ->orWhere('supplier_code', 'ilike', $term);
            });
        }
    }

    private function applySupplierOrder($query, string $q, ?string $qStart, string $term, bool $useFuzzy): void
    {
        $qBind = $q;
        if ($useFuzzy) {
            $query->orderByRaw(
                "CASE WHEN supplier_code = ? THEN 0 WHEN supplier_code ILIKE ? THEN 1 WHEN legal_name_en ILIKE ? OR trade_name ILIKE ? THEN 2 WHEN legal_name_en ILIKE ? OR trade_name ILIKE ? OR supplier_code ILIKE ? THEN 3 ELSE 4 END, similarity(legal_name_en, ?) DESC NULLS LAST",
                [$qBind, $qStart, $qStart, $qStart, $term, $term, $term, $q]
            );
        } else {
            $query->orderByRaw(
                "CASE WHEN supplier_code = ? THEN 0 WHEN supplier_code ILIKE ? THEN 1 WHEN legal_name_en ILIKE ? OR trade_name ILIKE ? THEN 2 WHEN legal_name_en ILIKE ? OR trade_name ILIKE ? OR supplier_code ILIKE ? THEN 3 ELSE 4 END",
                [$qBind, $qStart, $qStart, $qStart, $term, $term, $term]
            );
        }
    }

    private function searchRfqs(string $q, ?string $term, ?string $qStart, bool $useFuzzy): array
    {
        $query = Rfq::query()->with(['project']);
        if ($term === null) {
            $query->orderByDesc('created_at');
        } else {
            $this->applyRfqWhere($query, $term, $q, $useFuzzy);
            $this->applyRfqOrder($query, $q, $qStart, $term, $useFuzzy);
        }
        return $query->limit(self::LIMIT_PER_GROUP)->get()->map(fn (Rfq $r) => [
            'type' => 'rfq',
            'id' => $r->id,
            'label' => $r->title ?: $r->rfq_number,
            'description' => $r->rfq_number . ' · ' . $r->status,
            'url' => route('rfqs.show', $r->id),
            'icon' => 'file-text',
            'breadcrumbs' => 'RFQ • ' . ($r->project?->name ?? '—'),
            'status' => $r->status,
            'project_name' => $r->project?->name,
            'preview' => [
                'title' => $r->title ?: $r->rfq_number,
                'rfq_number' => $r->rfq_number,
                'status' => $r->status,
                'project' => $r->project?->name,
                'closing_date' => $r->submission_deadline?->format('Y-m-d'),
            ],
        ])->values()->all();
    }

    private function applyRfqWhere($query, string $term, string $q, bool $useFuzzy): void
    {
        if ($useFuzzy) {
            $query->where(function ($qry) use ($term, $q) {
                $qry->where('rfq_number', 'ilike', $term)
                    ->orWhere('title', 'ilike', $term)
                    ->orWhereRaw('similarity(rfq_number, ?) > ?', [$q, self::SIMILARITY_THRESHOLD])
                    ->orWhereRaw('similarity(title, ?) > ?', [$q, self::SIMILARITY_THRESHOLD]);
            });
        } else {
            $query->where(function ($qry) use ($term) {
                $qry->where('rfq_number', 'ilike', $term)->orWhere('title', 'ilike', $term);
            });
        }
    }

    private function applyRfqOrder($query, string $q, ?string $qStart, string $term, bool $useFuzzy): void
    {
        $qBind = $q;
        if ($useFuzzy) {
            $query->orderByRaw(
                "CASE WHEN rfq_number = ? THEN 0 WHEN rfq_number ILIKE ? THEN 1 WHEN title ILIKE ? THEN 2 WHEN rfq_number ILIKE ? OR title ILIKE ? THEN 3 ELSE 4 END, similarity(COALESCE(title, rfq_number), ?) DESC NULLS LAST",
                [$qBind, $qStart, $qStart, $term, $term, $q]
            );
        } else {
            $query->orderByRaw(
                "CASE WHEN rfq_number = ? THEN 0 WHEN rfq_number ILIKE ? THEN 1 WHEN title ILIKE ? THEN 2 WHEN rfq_number ILIKE ? OR title ILIKE ? THEN 3 ELSE 4 END",
                [$qBind, $qStart, $qStart, $term, $term]
            );
        }
    }

    private function quickCommands($user, string $rawQ): array
    {
        $qLower = mb_strtolower(trim($rawQ));
        $commands = [];
        if ($user->can('projects.create')) {
            $commands[] = ['type' => 'command', 'id' => 'create-project', 'label' => 'Create Project', 'description' => 'Create a new project', 'url' => route('projects.create'), 'icon' => 'plus'];
        }
        if ($user->can('suppliers.create')) {
            $commands[] = ['type' => 'command', 'id' => 'create-supplier', 'label' => 'Create Supplier', 'description' => 'Create a new supplier', 'url' => route('suppliers.create'), 'icon' => 'plus'];
        }
        if ($user->can('rfq.view')) {
            $commands[] = ['type' => 'command', 'id' => 'create-rfq', 'label' => 'Create RFQ', 'description' => 'Create a new RFQ', 'url' => '/rfqs/create', 'icon' => 'plus'];
        }
        if ($qLower !== '') {
            $commands = array_values(array_filter($commands, function ($c) use ($qLower) {
                return str_contains(mb_strtolower($c['label']), $qLower) || str_contains(mb_strtolower($c['description']), $qLower);
            }));
        }
        return $commands;
    }

    /**
     * Record a selected item as recent (keep last RECENT_MAX per user).
     */
    public function recordRecent(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'model_id' => ['required', 'string', 'max:64'],
            'label' => ['required', 'string', 'max:500'],
            'url' => ['required', 'string', 'max:1024'],
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json([], 201);
        }

        if (! $this->hasRecentTable()) {
            return response()->json(['ok' => true], 201);
        }

        DB::table('search_recent_items')->insert([
            'user_id' => $user->id,
            'type' => $request->input('type'),
            'model_id' => $request->input('model_id'),
            'label' => $request->input('label'),
            'url' => $request->input('url'),
            'created_at' => now(),
        ]);

        $count = DB::table('search_recent_items')->where('user_id', $user->id)->count();
        if ($count > self::RECENT_MAX) {
            $ids = DB::table('search_recent_items')
                ->where('user_id', $user->id)
                ->orderBy('created_at')
                ->limit($count - self::RECENT_MAX)
                ->pluck('id');
            DB::table('search_recent_items')->whereIn('id', $ids)->delete();
        }

        return response()->json(['ok' => true], 201);
    }

    /**
     * Add a favorite.
     */
    public function addFavorite(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'model_id' => ['required', 'string', 'max:64'],
            'label' => ['required', 'string', 'max:500'],
            'url' => ['required', 'string', 'max:1024'],
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json([], 403);
        }

        if (! $this->hasFavoritesTable()) {
            return response()->json(['ok' => true], 201);
        }

        DB::table('search_favorites')->insertOrIgnore([
            'user_id' => $user->id,
            'type' => $request->input('type'),
            'model_id' => $request->input('model_id'),
            'label' => $request->input('label'),
            'url' => $request->input('url'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true], 201);
    }

    /**
     * Remove a favorite by id.
     */
    public function removeFavorite(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([], 403);
        }

        if (! $this->hasFavoritesTable()) {
            return response()->json(['ok' => false], 200);
        }

        $deleted = DB::table('search_favorites')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['ok' => $deleted > 0], 200);
    }

    private function getRecent($user): array
    {
        if (! $this->hasRecentTable()) {
            return [];
        }

        return DB::table('search_recent_items')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(self::RECENT_MAX)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'type' => $row->type,
                'model_id' => $row->model_id,
                'label' => $row->label,
                'url' => $row->url,
                'icon' => $this->iconForType($row->type),
            ])
            ->all();
    }

    private function getFavorites($user): array
    {
        if (! $this->hasFavoritesTable()) {
            return [];
        }

        return DB::table('search_favorites')
            ->where('user_id', $user->id)
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'type' => $row->type,
                'model_id' => $row->model_id,
                'label' => $row->label,
                'url' => $row->url,
                'icon' => $this->iconForType($row->type),
            ])
            ->all();
    }

    private function iconForType(string $type): string
    {
        return match ($type) {
            'project' => 'folder',
            'supplier' => 'building',
            'rfq' => 'file-text',
            'contract' => 'file-signature',
            'settings' => 'settings',
            default => 'circle',
        };
    }

    private function settingsEntries($user, string $q): array
    {
        $entries = [];

        if ($user->can('settings.manage')) {
            $entries[] = ['label' => 'Mail Settings', 'url' => route('settings.mail'), 'match' => 'mail settings'];
        }
        if ($user->can('users.view')) {
            $entries[] = ['label' => 'Users', 'url' => route('settings.users.index'), 'match' => 'users'];
        }
        if ($user->can('suppliers.create')) {
            $entries[] = ['label' => 'Supplier Categories', 'url' => route('admin.supplier-categories.index'), 'match' => 'supplier categories'];
            $entries[] = ['label' => 'Supplier Capabilities', 'url' => route('admin.supplier-capabilities.index'), 'match' => 'supplier capabilities'];
            $entries[] = ['label' => 'Certifications', 'url' => route('admin.certifications.index'), 'match' => 'certifications'];
        }

        $qLower = mb_strtolower($q);
        $filtered = $q === ''
            ? $entries
            : array_filter($entries, fn ($e) => str_contains(mb_strtolower($e['match']), $qLower) || str_contains(mb_strtolower($e['label']), $qLower));

        return array_map(fn ($e) => [
            'type' => 'settings',
            'id' => 'settings-' . md5($e['url']),
            'label' => $e['label'],
            'description' => '',
            'url' => $e['url'],
            'icon' => 'settings',
        ], array_values($filtered));
    }

    private function hasRecentTable(): bool
    {
        return Schema::hasTable('search_recent_items');
    }

    private function hasFavoritesTable(): bool
    {
        return Schema::hasTable('search_favorites');
    }
}
