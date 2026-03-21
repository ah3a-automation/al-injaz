<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Application\Procurement\Services\CreateRfqFromPackageService;
use App\Application\Procurement\Services\SubmitRfqQuoteService;
use App\Models\BoqVersion;
use App\Models\Contract;
use App\Models\ContractInvoice;
use App\Models\ContractVariation;
use App\Models\ProcurementPackage;
use App\Models\ProcurementPackageAttachment;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\Rfq;
use App\Models\RfqClarification;
use App\Models\RfqEvaluation;
use App\Models\RfqSupplierInvitation;
use App\Models\RfqSupplierQuote;
use App\Models\Supplier;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\Procurement\ContractInvoiceService;
use App\Services\Procurement\ContractLifecycleService;
use App\Services\Procurement\ContractService;
use App\Services\Contracts\ContractAdministrationBaselineService;
use App\Services\Contracts\ContractVariationService;
use App\Services\Procurement\PackageReadinessService;
use App\Services\Procurement\RfqAwardService;
use App\Services\Procurement\RfqClarificationService;
use App\Services\Procurement\RfqComparisonService;
use App\Services\Procurement\RfqEvaluationService;
use App\Services\Procurement\RfqEventService;
use App\Services\Procurement\RfqQuoteService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class EnterpriseProcurementSeeder extends Seeder
{
    private const RNG_SEED = 20260309;

    /** @var array<string, array<string, bool>> */
    private array $tableColumnsCache = [];

    /** @var array<int, string> */
    private const SAUDI_CITIES = [
        'Riyadh',
        'Jeddah',
        'Dammam',
        'Khobar',
        'Medina',
        'Tabuk',
        'Abha',
    ];

    /** @var array<int, string> */
    private const PROJECT_NAMES = [
        'Airport Expansion',
        'Hospital Construction',
        'Power Substation',
        'University Campus',
        'Smart City Infrastructure',
    ];

    /** @var array<int, string> */
    private const PACKAGE_CATEGORIES = [
        'Electrical',
        'Mechanical',
        'Civil',
        'IT Infrastructure',
        'HVAC',
    ];

    public function run(): void
    {
        // WARNING: This seeder is NOT idempotent.
        // Only run on a fresh database or after php artisan migrate:fresh
        // To restore admin user only: php artisan db:seed --class=AdminUserSeeder
        mt_srand(self::RNG_SEED);
        $this->call([
            NotificationTemplateSeeder::class,
            SystemSettingsSeeder::class,
            SupplierCapabilitiesSeeder::class,
            CertificationsSeeder::class,
        ]);

        $users = $this->seedUsers();
        $suppliers = $this->seedSuppliers($users['supplier_users'], $users['super_admin']);
        $projects = $this->seedProjects($users['procurement_managers']);
        $projectBoqPools = $this->seedBoqItemsForProjects($projects, $users['procurement_managers'][0]);
        $packages = $this->seedProcurementPackages($projects, $projectBoqPools, $users['procurement_managers']);

        $rfqs = $this->seedRfqsAndDocuments($packages, $suppliers, $users['procurement_managers']);
        $this->seedClarifications($rfqs, $suppliers, $users['procurement_managers']);
        $quoteTotalsByRfqSupplier = $this->seedQuotes($rfqs, $suppliers);
        $this->runComparisonForAllRfqs($rfqs);

        $recommendations = $this->seedEvaluationsAndRecommendations($rfqs, $suppliers, $users['evaluators']);
        $awards = $this->seedAwards($rfqs, $suppliers, $users['procurement_managers'], $recommendations, $quoteTotalsByRfqSupplier);
        $contracts = $this->seedContracts($awards, $users['procurement_managers']);
        $this->seedVariations($contracts, $users['procurement_managers']);
        $this->seedInvoicesForActiveContracts($contracts, $users['procurement_managers']);

        $this->printSummary($rfqs, $contracts, $suppliers);
    }

    /**
     * @return array{
     *   super_admin: User,
     *   procurement_managers: array<int, User>,
     *   evaluators: array<int, User>,
     *   supplier_users: array<int, User>
     * }
     */
    private function seedUsers(): array
    {
        $superAdmin = User::factory()->create([
            'name' => 'Enterprise Super Admin',
            'email' => 'enterprise.superadmin@al-injaz.test',
            'password' => Hash::make('password'),
            'status' => User::STATUS_ACTIVE,
            'must_change_password' => false,
            'email_verified_at' => now(),
        ]);
        $superAdmin->assignRole('super_admin');

        $procurementManagers = [];
        for ($i = 1; $i <= 2; $i++) {
            $user = User::factory()->create([
                'name' => "Procurement Manager {$i}",
                'email' => "proc.manager{$i}@al-injaz.test",
                'password' => Hash::make('password'),
                'status' => User::STATUS_ACTIVE,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);
            $user->assignRole('procurement_manager');
            $procurementManagers[] = $user;
        }

        $evaluators = [];
        for ($i = 1; $i <= 3; $i++) {
            $user = User::factory()->create([
                'name' => "Evaluator {$i}",
                'email' => "evaluator{$i}@al-injaz.test",
                'password' => Hash::make('password'),
                'status' => User::STATUS_ACTIVE,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);
            $user->assignRole('evaluator');
            $evaluators[] = $user;
        }

        $supplierUsers = [];
        for ($i = 1; $i <= 50; $i++) {
            $user = User::factory()->create([
                'name' => sprintf('Supplier User %02d', $i),
                'email' => sprintf('supplier.user%02d@al-injaz.test', $i),
                'password' => Hash::make('password'),
                'status' => User::STATUS_ACTIVE,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);
            $user->assignRole('supplier');
            $supplierUsers[] = $user;
        }

        return [
            'super_admin' => $superAdmin,
            'procurement_managers' => $procurementManagers,
            'evaluators' => $evaluators,
            'supplier_users' => $supplierUsers,
        ];
    }

    /**
     * @param  array<int, User>  $supplierUsers
     * @return array<int, Supplier>
     */
    private function seedSuppliers(array $supplierUsers, User $superAdmin): array
    {
        $suppliers = [];
        $supplierTypes = [
            Supplier::TYPE_SUPPLIER,
            Supplier::TYPE_SUBCONTRACTOR,
            Supplier::TYPE_SERVICE_PROVIDER,
            Supplier::TYPE_CONSULTANT,
        ];
        $financialRatings = ['A+', 'A', 'B+', 'B', 'C'];

        foreach ($supplierUsers as $index => $supplierUser) {
            $number = $index + 1;
            $city = self::SAUDI_CITIES[$index % count(self::SAUDI_CITIES)];

            $supplierData = [
                'id' => (string) Str::uuid(),
                'supplier_code' => sprintf('SUP-%04d', $number),
                'legal_name_en' => sprintf('%s Contracting Co. %02d', $city, $number),
                'trade_name' => sprintf('%s Build %02d', $city, $number),
                'supplier_type' => $supplierTypes[$index % count($supplierTypes)],
                'country' => 'Saudi Arabia',
                'city' => $city,
                'address' => sprintf('District %d, %s', ($index % 20) + 1, $city),
                'phone' => sprintf('+9665%08d', 10000000 + $number),
                'email' => $supplierUser->email,
                'status' => Supplier::STATUS_APPROVED,
                'is_verified' => true,
                'compliance_status' => Supplier::COMPLIANCE_VERIFIED,
                'financial_rating' => $financialRatings[$index % count($financialRatings)],
                'risk_score' => 20 + ($index % 60),
                'preferred_currency' => 'SAR',
                'payment_terms_days' => [30, 60, 90, 120][$index % 4],
                'supplier_user_id' => $supplierUser->id,
                'created_by_user_id' => $superAdmin->id,
                'approved_at' => now()->subDays(30 + ($index % 45)),
                'approved_by_user_id' => $superAdmin->id,
                'coordinates_locked' => true,
                'latitude' => 24.7136 + (($index % 7) * 0.05),
                'longitude' => 46.6753 + (($index % 7) * 0.05),
            ];

            $suppliers[] = Supplier::create(
                $this->filterExistingColumns('suppliers', $supplierData)
            );
        }

        return $suppliers;
    }

    /**
     * @param  array<int, User>  $procurementManagers
     * @return array<int, Project>
     */
    private function seedProjects(array $procurementManagers): array
    {
        $projects = [];
        foreach (self::PROJECT_NAMES as $idx => $name) {
            $projects[] = Project::create([
                'name' => $name,
                'name_en' => $name,
                'status' => 'active',
                'owner_user_id' => $procurementManagers[$idx % count($procurementManagers)]->id,
                'code' => sprintf('PRJ-%03d', $idx + 1),
                'currency' => 'SAR',
                'planned_margin_pct' => 15 + ($idx % 5),
                'min_margin_pct' => 10,
                'contract_value' => 50_000_000 + ($idx * 12_000_000),
                'start_date' => now()->subMonths(6 + $idx)->toDateString(),
                'end_date' => now()->addMonths(24 + $idx)->toDateString(),
                'client' => 'Public Infrastructure Authority',
            ]);
        }

        return $projects;
    }

    /**
     * @param  array<int, Project>  $projects
     * @return array<string, Collection<int, ProjectBoqItem>>
     */
    private function seedBoqItemsForProjects(array $projects, User $importedBy): array
    {
        $poolByProject = [];

        foreach ($projects as $projectIndex => $project) {
            $boqVersion = BoqVersion::create([
                'project_id' => $project->id,
                'version_no' => 1,
                'label' => 'Enterprise Seed v1',
                'status' => 'active',
                'imported_by' => $importedBy->id,
                'imported_at' => now()->subDays(10 + $projectIndex),
            ]);

            $rows = [];
            $itemCount = 60;
            for ($i = 1; $i <= $itemCount; $i++) {
                $qty = (float) (5 + (($i + $projectIndex) % 25));
                $unitPrice = (float) (700 + (($i * 137 + $projectIndex * 41) % 3_500));
                $plannedCost = round($qty * $unitPrice, 2);
                $revenue = round($plannedCost * (1.12 + (($i + $projectIndex) % 9) / 100), 2);
                $category = self::PACKAGE_CATEGORIES[($i + $projectIndex) % count(self::PACKAGE_CATEGORIES)];

                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'project_id' => $project->id,
                    'boq_version_id' => $boqVersion->id,
                    'code' => sprintf('%s-%s-%03d', $project->code, strtoupper(substr($category, 0, 3)), $i),
                    'description_en' => "{$category} scope item {$i} for {$project->name}",
                    'description_ar' => null,
                    'unit' => 'LS',
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'revenue_amount' => $revenue,
                    'planned_cost' => $plannedCost,
                    'lead_type' => ($i % 3 === 0) ? 'long' : 'short',
                    'is_provisional' => false,
                    'sort_order' => $i,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            ProjectBoqItem::insert($rows);
            $items = ProjectBoqItem::query()
                ->where('project_id', $project->id)
                ->orderBy('sort_order')
                ->get();

            $boqVersion->update([
                'item_count' => $items->count(),
                'total_revenue' => (float) $items->sum('revenue_amount'),
                'total_planned_cost' => (float) $items->sum('planned_cost'),
            ]);

            $poolByProject[$project->id] = $items;
        }

        return $poolByProject;
    }

    /**
     * @param  array<int, Project>  $projects
     * @param  array<string, Collection<int, ProjectBoqItem>>  $projectBoqPools
     * @param  array<int, User>  $procurementManagers
     * @return array<int, ProcurementPackage>
     */
    private function seedProcurementPackages(array $projects, array $projectBoqPools, array $procurementManagers): array
    {
        $readinessService = app(PackageReadinessService::class);
        $packages = [];

        foreach ($projects as $projectIndex => $project) {
            /** @var Collection<int, ProjectBoqItem> $pool */
            $pool = $projectBoqPools[$project->id];

            for ($p = 1; $p <= 4; $p++) {
                $category = self::PACKAGE_CATEGORIES[($projectIndex * 4 + $p - 1) % count(self::PACKAGE_CATEGORIES)];
                $boqCount = 5 + (($projectIndex + $p) % 11); // 5..15
                $selectedItems = $this->deterministicSlice($pool, ($projectIndex * 9) + ($p * 7), $boqCount);

                $estimatedCostBase = (float) $selectedItems->sum('planned_cost');
                $costMultiplier = 4.0 + (((($projectIndex * 4) + $p) % 9) * 1.4);
                $estimatedCost = min(15_000_000, max(500_000, round($estimatedCostBase * $costMultiplier, 2)));
                $marginMultiplier = 1.08 + (((($projectIndex * 4) + $p) % 15) / 100);
                $estimatedRevenue = round($estimatedCost * $marginMultiplier, 2);
                $manager = $procurementManagers[($projectIndex + $p) % count($procurementManagers)];

                $package = ProcurementPackage::create([
                    'project_id' => $project->id,
                    'package_no' => sprintf('%s-PKG-%03d', $project->code, $p),
                    'name' => "{$category} Package {$p}",
                    'description' => "Enterprise seeded package for {$category} scope.",
                    'currency' => 'SAR',
                    'needed_by_date' => now()->addDays(20 + (($projectIndex + $p) * 3))->toDateString(),
                    'estimated_revenue' => max(500_000, round($estimatedRevenue, 2)),
                    'estimated_cost' => max(400_000, round($estimatedCost, 2)),
                    'actual_cost' => 0,
                    'status' => ProcurementPackage::STATUS_DRAFT,
                    'created_by' => $manager->id,
                ]);

                $package->boqItems()->sync($selectedItems->pluck('id')->all());

                $attachmentCount = 3 + (($projectIndex + $p) % 3); // 3..5
                for ($a = 1; $a <= $attachmentCount; $a++) {
                    $docType = [
                        ProcurementPackageAttachment::DOCUMENT_SPECIFICATIONS,
                        ProcurementPackageAttachment::DOCUMENT_DRAWINGS,
                        ProcurementPackageAttachment::DOCUMENT_BOQ,
                        ProcurementPackageAttachment::DOCUMENT_OTHER,
                    ][($a + $p) % 4];

                    $package->attachments()->create([
                        'document_type' => $docType,
                        'source_type' => ProcurementPackageAttachment::SOURCE_UPLOAD,
                        'title' => "{$category} Attachment {$a}",
                        'file_path' => "seed/procurement-packages/{$package->id}/attachment-{$a}.pdf",
                        'mime_type' => 'application/pdf',
                        'file_size_bytes' => 120_000 + ($a * 5_000),
                        'uploaded_by' => $manager->id,
                    ]);
                }

                $readiness = $readinessService->check($package);
                $package->update([
                    'readiness_score' => $readiness['score'],
                    'readiness_cached_at' => now(),
                ]);

                $packages[] = $package;
            }
        }

        return $packages;
    }

    /**
     * @param  array<int, ProcurementPackage>  $packages
     * @param  array<int, Supplier>  $suppliers
     * @param  array<int, User>  $procurementManagers
     * @return array<int, Rfq>
     */
    private function seedRfqsAndDocuments(array $packages, array $suppliers, array $procurementManagers): array
    {
        $createRfqService = app(CreateRfqFromPackageService::class);
        $rfqEventService = app(RfqEventService::class);
        $rfqs = [];
        $supplierCollection = collect($suppliers)->values();
        $invitePattern = [8, 9, 10, 11, 12]; // sums to 200 across 20 RFQs

        foreach ($packages as $index => $package) {
            $manager = $procurementManagers[$index % count($procurementManagers)];
            $inviteCount = $invitePattern[$index % count($invitePattern)];
            $invitedSuppliers = $this->deterministicSlice($supplierCollection, $index * 3, $inviteCount)->values();

            $rfq = $createRfqService->execute($package->fresh(), [
                'title' => "{$package->name} RFQ",
                'submission_deadline' => now()->addDays(7 + ($index % 15))->toDateString(),
                'currency' => 'SAR',
                'supplier_ids' => $invitedSuppliers->pluck('id')->all(),
                'created_by' => $manager->id,
            ]);

            $docCount = 2 + ($index % 2); // 2..3
            for ($d = 1; $d <= $docCount; $d++) {
                $rfq->documents()->create([
                    'document_type' => ['boq', 'drawings', 'specifications'][($d + $index) % 3],
                    'source_type' => 'upload',
                    'title' => "RFQ Document {$d}",
                    'file_path' => "seed/rfqs/{$rfq->id}/document-{$d}.pdf",
                    'mime_type' => 'application/pdf',
                    'file_size_bytes' => 100_000 + ($d * 25_000),
                    'uploaded_by' => $manager->id,
                ]);
            }

            $rfq->changeStatus(Rfq::STATUS_ISSUED, $manager);
            $rfq->update([
                'issued_by' => $manager->id,
                'issued_at' => now()->subDays(3 + ($index % 6)),
            ]);
            $rfqEventService->rfqIssued($rfq->fresh());

            $rfq->invitations()->get()->each(function (RfqSupplierInvitation $inv, int $invitationIndex): void {
                $viewedAt = $inv->invited_at
                    ? $inv->invited_at->copy()->addHours(2 + ($invitationIndex % 48))
                    : now()->subHours(2 + ($invitationIndex % 48));
                $inv->update([
                    'viewed_at' => $viewedAt,
                    'status' => RfqSupplierInvitation::STATUS_VIEWED,
                ]);
            });

            $rfqs[] = $rfq;
        }

        return $rfqs;
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     * @param  array<int, Supplier>  $suppliers
     * @param  array<int, User>  $procurementManagers
     */
    private function seedClarifications(array $rfqs, array $suppliers, array $procurementManagers): void
    {
        $clarificationService = app(RfqClarificationService::class);
        $supplierMap = collect($suppliers)->keyBy('id');

        foreach ($rfqs as $rfqIndex => $rfq) {
            $rfq = $rfq->fresh(['suppliers']);
            $invitedSupplierIds = $rfq->suppliers->pluck('supplier_id')->values();
            $clarificationCount = 1 + ($rfqIndex % 5);

            for ($c = 1; $c <= $clarificationCount; $c++) {
                $supplierId = $invitedSupplierIds[($rfqIndex + $c) % max(1, $invitedSupplierIds->count())] ?? null;
                /** @var Supplier|null $supplier */
                $supplier = $supplierId ? $supplierMap->get($supplierId) : null;

                $question = sprintf('Clarification %d for %s: Please confirm scope and delivery assumptions.', $c, $rfq->rfq_number);
                $clarification = $clarificationService->createQuestion(
                    $rfq,
                    $question,
                    $supplier,
                    $supplier?->supplierUser
                );

                if (($rfqIndex + $c) % 10 < 7) {
                    $actor = $procurementManagers[($rfqIndex + $c) % count($procurementManagers)];
                    $clarificationService->answerClarification(
                        $clarification,
                        'Answer: scope confirmed as per RFQ documents and BOQ lines.',
                        $actor
                    );
                }
            }
        }
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     * @param  array<int, Supplier>  $suppliers
     * @return array<string, float>
     */
    private function seedQuotes(array $rfqs, array $suppliers): array
    {
        $submitQuoteService = app(SubmitRfqQuoteService::class);
        $rfqQuoteService = app(RfqQuoteService::class);
        $supplierMap = collect($suppliers)->keyBy('id');
        $totalsByRfqSupplier = [];

        foreach ($rfqs as $rfqIndex => $rfq) {
            $rfq = $rfq->fresh(['items', 'suppliers']);
            $invitedSupplierIds = $rfq->suppliers->pluck('supplier_id')->values();

            foreach ($invitedSupplierIds as $supplierIndex => $supplierId) {
                /** @var Supplier|null $supplier */
                $supplier = $supplierMap->get($supplierId);
                if (! $supplier) {
                    continue;
                }

                $payload = ['supplier_id' => $supplier->id, 'items' => []];
                $totalAmount = 0.0;

                foreach ($rfq->items as $itemIndex => $item) {
                    $qty = max(1.0, (float) ($item->qty ?? 1));
                    $baseUnit = (float) $item->estimated_cost > 0
                        ? (float) $item->estimated_cost / $qty
                        : 1_000 + (($itemIndex + 1) * 25);
                    $markup = (90 + (($rfqIndex + $supplierIndex + $itemIndex) % 41)) / 100;
                    $unitPrice = round($baseUnit * $markup, 4);
                    $totalPrice = round($unitPrice * $qty, 4);
                    $totalAmount += $totalPrice;

                    $payload['items'][$item->id] = [
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                        'notes' => 'Enterprise seeded quote line.',
                    ];
                }

                $quote = $submitQuoteService->execute($rfq, $payload);
                $rfqQuoteService->recordSubmission(
                    $rfq->fresh(),
                    $supplier,
                    (float) round($totalAmount, 2),
                    $supplier->supplierUser
                );

                $quoteTotal = (float) $quote->items()->sum('total_price');
                $totalsByRfqSupplier[$rfq->id . '|' . $supplier->id] = (float) round($quoteTotal, 2);
            }
        }

        return $totalsByRfqSupplier;
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     */
    private function runComparisonForAllRfqs(array $rfqs): void
    {
        $comparisonService = app(RfqComparisonService::class);

        foreach ($rfqs as $rfq) {
            $comparison = $comparisonService->buildComparison($rfq->fresh());
            $first = $comparison['suppliers'][0] ?? null;
            if (! is_array($first) || ! array_key_exists('quote_rank', $first) || ! array_key_exists('deviation_from_estimate', $first)) {
                throw new \RuntimeException("Comparison output invalid for RFQ {$rfq->id}");
            }
        }
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     * @param  array<int, Supplier>  $suppliers
     * @param  array<int, User>  $evaluators
     * @return array<string, array{supplier_id: string|null, average_score: float}|null>
     */
    private function seedEvaluationsAndRecommendations(array $rfqs, array $suppliers, array $evaluators): array
    {
        $evaluationService = app(RfqEvaluationService::class);
        $supplierMap = collect($suppliers)->keyBy('id');
        $recommendations = [];

        foreach ($rfqs as $rfqIndex => $rfq) {
            $rfq = $rfq->fresh(['rfqSupplierQuotes']);
            $primaryEvaluator = $evaluators[$rfqIndex % count($evaluators)];
            $secondaryEvaluator = $evaluators[($rfqIndex + 1) % count($evaluators)];
            $rfq->changeStatus(Rfq::STATUS_UNDER_EVALUATION, $primaryEvaluator);

            $supplierIds = $rfq->rfqSupplierQuotes->pluck('supplier_id')->values();
            foreach ($supplierIds as $supplierId) {
                /** @var Supplier|null $supplier */
                $supplier = $supplierMap->get($supplierId);
                if (! $supplier) {
                    continue;
                }

                foreach ([$primaryEvaluator, $secondaryEvaluator] as $evaluator) {
                    $priceScore = 60 + (($rfqIndex + $evaluator->id + strlen($supplierId)) % 36);
                    $technicalScore = 60 + (($rfqIndex * 2 + $evaluator->id + strlen($supplier->supplier_code ?? '')) % 36);
                    $commercialScore = 60 + (($rfqIndex * 3 + $evaluator->id + strlen($supplier->legal_name_en)) % 36);

                    $evaluationService->recordEvaluation(
                        $rfq,
                        $supplier,
                        $evaluator,
                        (float) $priceScore,
                        (float) $technicalScore,
                        (float) $commercialScore,
                        'Enterprise seeded evaluator scoring.'
                    );
                }
            }

            $recommendations[$rfq->id] = $evaluationService->recommendSupplier($rfq->fresh(), $primaryEvaluator);
        }

        return $recommendations;
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     * @param  array<int, Supplier>  $suppliers
     * @param  array<int, User>  $procurementManagers
     * @param  array<string, array{supplier_id: string|null, average_score: float}|null>  $recommendations
     * @param  array<string, float>  $quoteTotalsByRfqSupplier
     * @return array<string, \App\Models\RfqAward>
     */
    private function seedAwards(
        array $rfqs,
        array $suppliers,
        array $procurementManagers,
        array $recommendations,
        array $quoteTotalsByRfqSupplier
    ): array {
        $awardService = app(RfqAwardService::class);
        $supplierMap = collect($suppliers)->keyBy('id');
        $awardsByRfq = [];
        $awardTarget = (int) floor(count($rfqs) * 0.70); // 70%

        foreach ($rfqs as $rfqIndex => $rfq) {
            if ($rfqIndex >= $awardTarget) {
                continue;
            }

            $rfq = $rfq->fresh();
            $recommended = $recommendations[$rfq->id]['supplier_id'] ?? null;
            $supplierId = $recommended;

            if ($supplierId === null) {
                $supplierId = RfqSupplierQuote::query()
                    ->where('rfq_id', $rfq->id)
                    ->orderBy('total_amount')
                    ->value('supplier_id');
            }

            /** @var Supplier|null $supplier */
            $supplier = $supplierId ? $supplierMap->get($supplierId) : null;
            if (! $supplier) {
                continue;
            }

            $amount = $quoteTotalsByRfqSupplier[$rfq->id . '|' . $supplier->id]
                ?? (float) RfqSupplierQuote::query()
                    ->where('rfq_id', $rfq->id)
                    ->where('supplier_id', $supplier->id)
                    ->value('total_amount')
                ?? 0.0;
            $amount = max(1.0, (float) round($amount, 2));

            $actor = $procurementManagers[$rfqIndex % count($procurementManagers)];
            $award = $awardService->awardSupplier(
                $rfq,
                $supplier,
                $actor,
                $amount,
                'SAR',
                'Auto-awarded by enterprise seeder.'
            );

            $awardsByRfq[$rfq->id] = $award;
        }

        return $awardsByRfq;
    }

    /**
     * @param  array<string, \App\Models\RfqAward>  $awardsByRfq
     * @param  array<int, User>  $procurementManagers
     * @return array<int, Contract>
     */
    private function seedContracts(array $awardsByRfq, array $procurementManagers): array
    {
        $contractService = app(ContractService::class);
        $lifecycleService = app(ContractLifecycleService::class);
        $contracts = [];

        foreach ($awardsByRfq as $rfqId => $award) {
            $rfq = Rfq::query()->findOrFail($rfqId);
            $actor = $procurementManagers[count($contracts) % count($procurementManagers)];
            $contracts[] = $contractService->createFromAward($rfq, $award, $actor);
        }

        $total = count($contracts);
        $draftTarget = (int) floor($total * 0.40);
        $activeTarget = (int) floor($total * 0.40);
        $completedTarget = $total - $draftTarget - $activeTarget;

        foreach ($contracts as $index => $contract) {
            $actor = $procurementManagers[$index % count($procurementManagers)];
            if ($index < $draftTarget) {
                continue;
            }

            $contract = $contract->fresh();
            $lifecycleService->sendForSignature($contract, $actor);
            $lifecycleService->activateContract($contract->fresh(), $actor);

            if ($index >= ($draftTarget + $activeTarget) && $completedTarget > 0) {
                $lifecycleService->completeContract($contract->fresh(), $actor);
                $completedTarget--;
            }
        }

        $contracts = array_map(static fn (Contract $contract): Contract => $contract->fresh(), $contracts);

        $adminService = app(ContractAdministrationBaselineService::class);
        $executedForVariations = (int) floor(count($contracts) * 0.25);
        for ($i = $draftTarget; $i < min($draftTarget + $executedForVariations, count($contracts)); $i++) {
            $c = $contracts[$i]->fresh();
            if ($c === null || $c->status !== Contract::STATUS_ACTIVE) {
                continue;
            }
            $c->status = Contract::STATUS_EXECUTED;
            $c->contract_number = $c->contract_number ?: 'CON-' . strtoupper(substr((string) $c->id, 0, 8));
            $c->save();
            $actor = $procurementManagers[$i % count($procurementManagers)];
            try {
                $adminService->initializeAdministrationBaseline(
                    $c->fresh(),
                    [
                        'contract_value_final' => (float) $c->contract_value,
                        'currency_final' => $c->currency ?: 'SAR',
                    ],
                    $actor
                );
            } catch (\Throwable $e) {
                continue;
            }
        }

        return array_values(array_map(static fn (Contract $contract): Contract => $contract->fresh(), $contracts));
    }

    /**
     * @param  array<int, Contract>  $contracts
     * @param  array<int, User>  $procurementManagers
     */
    private function seedVariations(array $contracts, array $procurementManagers): void
    {
        $variationService = app(ContractVariationService::class);
        $types = [
            ContractVariation::TYPE_COMMERCIAL,
            ContractVariation::TYPE_TIME,
            ContractVariation::TYPE_COMMERCIAL_TIME,
            ContractVariation::TYPE_ADMINISTRATIVE,
        ];

        $eligibleContracts = collect($contracts)->filter(
            static fn (Contract $c): bool => $c->fresh()->status === Contract::STATUS_EXECUTED
                && $c->fresh()->administration_status === Contract::ADMIN_STATUS_INITIALIZED
        )->values()->all();

        foreach ($eligibleContracts as $contractIndex => $contract) {
            $contract = $contract->fresh();
            if ($contract === null) {
                continue;
            }
            $variationCount = $contractIndex % 4;
            if ($variationCount === 0) {
                continue;
            }
            for ($i = 1; $i <= $variationCount; $i++) {
                $actor = $procurementManagers[($contractIndex + $i) % count($procurementManagers)];
                $type = $types[($contractIndex + $i) % count($types)];
                $delta = 50_000 + (($contractIndex + $i) * 9_000);
                $timeDelta = in_array($type, [ContractVariation::TYPE_TIME, ContractVariation::TYPE_COMMERCIAL_TIME], true)
                    ? 7 + (($contractIndex + $i) % 45)
                    : ($contractIndex + $i) % 10;

                try {
                    $variation = $variationService->createVariation(
                        $contract,
                        [
                            'title' => "Variation {$i}",
                            'variation_type' => $type,
                            'reason' => 'Enterprise seeded variation.',
                            'description' => 'Enterprise seeded variation.',
                            'commercial_delta' => $type !== ContractVariation::TYPE_TIME ? $delta : null,
                            'currency' => $contract->currency ?: 'SAR',
                            'time_delta_days' => $timeDelta,
                        ],
                        $actor
                    );
                } catch (\Throwable $e) {
                    continue;
                }

                $state = ($contractIndex + $i) % 100;
                if ($state < 25) {
                    continue;
                }
                $variationService->submitVariation($variation->fresh(), $actor);

                if ($state < 45) {
                    continue;
                }
                if ($state < 70) {
                    $variationService->approveVariation($variation->fresh(), $actor, null);
                    continue;
                }
                if ($state < 85) {
                    $variationService->rejectVariation($variation->fresh(), $actor, null);
                    continue;
                }
                $variationService->approveVariation($variation->fresh(), $actor, null);
            }
        }
    }

    /**
     * @param  array<int, Contract>  $contracts
     * @param  array<int, User>  $procurementManagers
     */
    private function seedInvoicesForActiveContracts(array $contracts, array $procurementManagers): void
    {
        $invoiceService = app(ContractInvoiceService::class);
        $activeContracts = collect($contracts)->filter(
            static fn (Contract $contract): bool => $contract->fresh()->status === Contract::STATUS_ACTIVE
        )->values();

        foreach ($activeContracts as $contractIndex => $contract) {
            $invoiceCount = 1 + ($contractIndex % 5); // 1..5
            for ($i = 1; $i <= $invoiceCount; $i++) {
                $actor = $procurementManagers[($contractIndex + $i) % count($procurementManagers)];
                $baseAmount = max(
                    25_000.0,
                    ((float) $contract->contract_value / (float) max(2, $invoiceCount + 1))
                        * (0.75 + ((($contractIndex + $i) % 30) / 100))
                );
                $amount = (float) round($baseAmount, 2);
                $retention = (float) round($amount * (0.03 + ((($contractIndex + $i) % 8) / 100)), 2);
                if ($retention >= $amount) {
                    $retention = (float) round($amount * 0.1, 2);
                }

                $invoice = $invoiceService->createInvoice(
                    $contract->fresh(),
                    $actor,
                    sprintf('INV-%s-%02d', strtoupper(substr((string) $contract->id, 0, 6)), $i),
                    now()->subDays(($contractIndex + $i) % 20)->toDateString(),
                    $amount,
                    $retention,
                    'SAR',
                    'Enterprise seeded invoice.'
                );

                $state = ($contractIndex * 7 + $i * 13) % 100;
                if ($state < 20) {
                    continue; // draft
                }
                $invoiceService->submitInvoice($invoice->fresh(), $actor);
                if ($state < 50) {
                    continue; // submitted
                }
                $invoiceService->approveInvoice($invoice->fresh(), $actor);
                if ($state < 75) {
                    continue; // approved
                }
                $invoiceService->markPaid($invoice->fresh(), $actor);
            }
        }
    }

    /**
     * @template T of object
     *
     * @param  Collection<int, T>  $items
     * @return Collection<int, T>
     */
    private function deterministicSlice(Collection $items, int $offset, int $length): Collection
    {
        $total = $items->count();
        if ($total === 0 || $length <= 0) {
            return collect();
        }

        $length = min($length, $total);
        $start = $offset % $total;
        $result = collect();

        for ($i = 0; $i < $length; $i++) {
            $result->push($items[($start + $i) % $total]);
        }

        return $result->values();
    }

    /**
     * @param  array<int, Rfq>  $rfqs
     * @param  array<int, Contract>  $contracts
     * @param  array<int, Supplier>  $suppliers
     */
    private function printSummary(array $rfqs, array $contracts, array $suppliers): void
    {
        $activitiesCount = DB::table('package_activities')->count()
            + DB::table('rfq_activities')->count()
            + DB::table('contract_activities')->count();

        $summary = [
            'projects' => Project::count(),
            'packages' => ProcurementPackage::count(),
            'rfqs' => Rfq::count(),
            'suppliers' => Supplier::count(),
            'quotes' => RfqSupplierQuote::count(),
            'clarifications' => RfqClarification::count(),
            'evaluations' => RfqEvaluation::count(),
            'contracts' => Contract::count(),
            'variations' => ContractVariation::count(),
            'invoices' => ContractInvoice::count(),
            'notifications' => SystemNotification::count(),
            'activities' => $activitiesCount,
        ];

        if ($this->command !== null) {
            $this->command->newLine();
            $this->command->info('Enterprise procurement demo data generated.');
            foreach ($summary as $key => $value) {
                $this->command->line(str_pad($key, 14) . ': ' . $value);
            }

            $exampleRfq = $rfqs[0]->id ?? null;
            $exampleContract = $contracts[0]->id ?? null;
            $exampleSupplier = $suppliers[0]->id ?? null;

            $this->command->newLine();
            $this->command->info('Sample IDs');
            $this->command->line('example RFQ     : ' . ($exampleRfq ?? 'n/a'));
            $this->command->line('example Contract: ' . ($exampleContract ?? 'n/a'));
            $this->command->line('example Supplier: ' . ($exampleSupplier ?? 'n/a'));
        }

        // Always recreate stable admin user after demo data generation
        // (demo seeder creates its own users which can orphan admin@al-injaz.test)
        (new AdminUserSeeder())->run();
    }

    /**
     * Keep inserts resilient when migrations add/drop optional columns across environments.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function filterExistingColumns(string $table, array $attributes): array
    {
        if (! isset($this->tableColumnsCache[$table])) {
            $this->tableColumnsCache[$table] = array_fill_keys(Schema::getColumnListing($table), true);
        }

        return array_intersect_key($attributes, $this->tableColumnsCache[$table]);
    }
}
